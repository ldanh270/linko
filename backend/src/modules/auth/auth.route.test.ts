import { API_ROUTES, ERROR_CODES } from "@linko/contracts"
import cookieParser from "cookie-parser"
import express, { type Express } from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { createGlobalErrorHandler } from "../../shared/middlewares/globalErrorHandler"
import { withRequestContext } from "../../shared/middlewares/requestContext"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { createLogger, type LogRecord } from "../../shared/logger/logger"
import { AuthController } from "./auth.controller"
import { AUTH_COOKIE_NAME, AUTH_FIELDS, AUTH_ROUTE_PATHS } from "./auth.constants"
import { MongooseAuthRepository } from "./auth.repository"
import { AuthTokenService, BcryptPasswordHasher } from "./auth.security"
import { AuthService } from "./auth.service"
import type { AuthCookieConfiguration, AuthRepository } from "./auth.types"
import { createAuthRouter } from "./auth.route"
import Session from "../../models/Session"
import User from "../../models/User"

const TEST_CREDENTIALS = {
    username: "reader",
    password: "ValidPass1!",
    email: "reader@example.com",
    displayName: "Reader",
} as const
const TEST_TOKEN_SECRET = "test-secret-with-enough-entropy-for-linko-auth"
const TEST_COOKIE_CONFIGURATION: AuthCookieConfiguration = {
    path: "/",
    secure: false,
    sameSite: "lax",
}

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } })
    await mongoose.connect(replicaSet.getUri(), { dbName: "auth-route-test" })
    await Promise.all([User.init(), Session.init()])
})

beforeEach(async () => {
    await Promise.all([
        User.collection.deleteMany({}),
        Session.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

/** Compose a real auth service with a replaceable repository for HTTP boundary tests. */
function createAuthTestApp(repository: AuthRepository = new MongooseAuthRepository()): Express {
    const tokenService = new AuthTokenService(TEST_TOKEN_SECRET)
    const service = new AuthService({
        repository,
        passwordHasher: new BcryptPasswordHasher(),
        tokenProvider: tokenService,
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date() },
    })
    const records: LogRecord[] = []
    const app = express()
    app.use(withRequestContext)
    app.use(express.json())
    app.use(cookieParser())
    app.use(API_ROUTES.AUTH, createAuthRouter(new AuthController(service, TEST_COOKIE_CONFIGURATION)))
    app.use(createGlobalErrorHandler(createLogger((record) => records.push(record))))
    return app
}

/** Create an account for login-only route scenarios. */
async function createTestAccount(): Promise<void> {
    const hashedPassword = await new BcryptPasswordHasher().hash(TEST_CREDENTIALS.password)
    await User.create({ ...TEST_CREDENTIALS, [AUTH_FIELDS.HASHED_PASSWORD]: hashedPassword })
}

/** Read the opaque refresh token value from a Set-Cookie header. */
function getRefreshCookieValue(response: { headers: Record<string, string | string[] | undefined> }): string {
    const cookie = response.headers["set-cookie"]
    const value = (Array.isArray(cookie) ? cookie : [cookie]).find((entry) =>
        typeof entry === "string" && entry.startsWith(`${AUTH_COOKIE_NAME}=`),
    )
    if (!value) throw new Error("The response did not set a refresh cookie")
    const token = value.split(";")[0]?.slice(AUTH_COOKIE_NAME.length + 1)
    if (!token) throw new Error("The refresh cookie did not contain a token")
    return token
}

/** Find the cookie header that clears the opaque refresh credential. */
function getClearedRefreshCookieHeader(response: { headers: Record<string, string | string[] | undefined> }): string {
    const cookie = response.headers["set-cookie"]
    const value = (Array.isArray(cookie) ? cookie : [cookie]).find((entry) =>
        typeof entry === "string" && entry.startsWith(`${AUTH_COOKIE_NAME}=`),
    )
    if (!value) throw new Error("The response did not clear the refresh cookie")
    return value
}

describe("auth HTTP routes", () => {
    it("returns a safe user DTO in the signup success envelope", async () => {
        const response = await request(createAuthTestApp())
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.SIGNUP}`)
            .send(TEST_CREDENTIALS)

        expect(response.status).toBe(201)
        expect(response.body).toMatchObject({
            success: true,
            data: {
                id: expect.any(String),
                username: TEST_CREDENTIALS.username,
                displayName: TEST_CREDENTIALS.displayName,
                email: TEST_CREDENTIALS.email,
            },
            error: null,
            meta: null,
        })
        expect(response.body.data).not.toHaveProperty(AUTH_FIELDS.HASHED_PASSWORD)
        expect(response.body.data).not.toHaveProperty(AUTH_FIELDS.DELETED)
    })

    it("returns the shared 400 envelope for an invalid password", async () => {
        const response = await request(createAuthTestApp())
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.SIGNUP}`)
            .send({ ...TEST_CREDENTIALS, password: "weak" })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("sets an HttpOnly refresh cookie and persists only its hash on login", async () => {
        await createTestAccount()

        const response = await request(createAuthTestApp())
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`)
            .send({ username: TEST_CREDENTIALS.username, password: TEST_CREDENTIALS.password })

        const refreshToken = getRefreshCookieValue(response)
        const tokenService = new AuthTokenService(TEST_TOKEN_SECRET)
        const savedSession = await Session.findOne({
            [AUTH_FIELDS.REFRESH_TOKEN_HASH]: tokenService.hashRefreshToken(refreshToken),
        })
        const plaintextSession = await Session.collection.findOne({ [AUTH_FIELDS.REFRESH_TOKEN]: refreshToken })

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({ success: true, data: { accessToken: expect.any(String) } })
        expect(response.headers["set-cookie"]).toEqual(expect.arrayContaining([expect.stringMatching(/HttpOnly/i)]))
        expect(savedSession).not.toBeNull()
        expect(plaintextSession).toBeNull()
    })

    it("rotates a refresh cookie once and rejects reuse of the prior token", async () => {
        await createTestAccount()
        const app = createAuthTestApp()
        const loginResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`)
            .send({ username: TEST_CREDENTIALS.username, password: TEST_CREDENTIALS.password })
        const originalToken = getRefreshCookieValue(loginResponse)

        const refreshResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`)
            .set("Cookie", `${AUTH_COOKIE_NAME}=${originalToken}`)
        const rotatedToken = getRefreshCookieValue(refreshResponse)
        const tokenService = new AuthTokenService(TEST_TOKEN_SECRET)
        const oldSession = await Session.findOne({
            [AUTH_FIELDS.REFRESH_TOKEN_HASH]: tokenService.hashRefreshToken(originalToken),
        })
            .setOptions({ includeDeleted: true })

        const replayResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`)
            .set("Cookie", `${AUTH_COOKIE_NAME}=${originalToken}`)

        expect(refreshResponse.status).toBe(200)
        expect(rotatedToken).not.toBe(originalToken)
        expect(oldSession?.get(AUTH_FIELDS.DELETED)).toBe(true)
        expect(replayResponse.status).toBe(401)
        expect(replayResponse.body.error.code).toBe(ERROR_CODES.INVALID_SESSION)
    })

    it("rejects refresh when the browser has no refresh cookie", async () => {
        const response = await request(createAuthTestApp())
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`)

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe(ERROR_CODES.INVALID_SESSION)
    })

    it("rejects expired refresh sessions and clears their cookie on logout", async () => {
        await createTestAccount()
        const app = createAuthTestApp()
        const loginResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`)
            .send({ username: TEST_CREDENTIALS.username, password: TEST_CREDENTIALS.password })
        const refreshToken = getRefreshCookieValue(loginResponse)
        const tokenService = new AuthTokenService(TEST_TOKEN_SECRET)
        await Session.collection.updateOne(
            { [AUTH_FIELDS.REFRESH_TOKEN_HASH]: tokenService.hashRefreshToken(refreshToken) },
            { $set: { [AUTH_FIELDS.EXPIRES_AT]: new Date(Date.now() - 1000) } },
        )

        const refreshResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`)
            .set("Cookie", `${AUTH_COOKIE_NAME}=${refreshToken}`)
        const logoutResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGOUT}`)
            .set("Cookie", `${AUTH_COOKIE_NAME}=${refreshToken}`)

        expect(refreshResponse.status).toBe(401)
        expect(refreshResponse.body.error.code).toBe(ERROR_CODES.INVALID_SESSION)
        expect(logoutResponse.status).toBe(200)
        const clearedCookie = getClearedRefreshCookieHeader(logoutResponse)
        expect(clearedCookie.startsWith(`${AUTH_COOKIE_NAME}=;`)).toBe(true)
        expect(clearedCookie.toLowerCase()).toContain(`path=${TEST_COOKIE_CONFIGURATION.path.toLowerCase()}`)
        expect(clearedCookie).toMatch(/HttpOnly/i)
        expect(clearedCookie.toLowerCase()).toContain(`samesite=${TEST_COOKIE_CONFIGURATION.sameSite}`)
    })

    it("clears the exact refresh cookie and invalidates its session on logout", async () => {
        await createTestAccount()
        const app = createAuthTestApp()
        const loginResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`)
            .send({ username: TEST_CREDENTIALS.username, password: TEST_CREDENTIALS.password })
        const refreshToken = getRefreshCookieValue(loginResponse)

        const logoutResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGOUT}`)
            .set("Cookie", `${AUTH_COOKIE_NAME}=${refreshToken}`)
        const replayResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`)
            .set("Cookie", `${AUTH_COOKIE_NAME}=${refreshToken}`)

        expect(logoutResponse.status).toBe(200)
        expect(logoutResponse.body).toMatchObject({ success: true, data: null, error: null, meta: null })
        const clearedCookie = getClearedRefreshCookieHeader(logoutResponse)
        expect(clearedCookie.startsWith(`${AUTH_COOKIE_NAME}=;`)).toBe(true)
        expect(clearedCookie.toLowerCase()).toContain(`path=${TEST_COOKIE_CONFIGURATION.path.toLowerCase()}`)
        expect(clearedCookie).toMatch(/HttpOnly/i)
        expect(clearedCookie.toLowerCase()).toContain(`samesite=${TEST_COOKIE_CONFIGURATION.sameSite}`)
        expect(replayResponse.status).toBe(401)
        expect(replayResponse.body.error.code).toBe(ERROR_CODES.INVALID_SESSION)
    })

    it("returns a generic 500 envelope for technical service failures", async () => {
        const repository = new MongooseAuthRepository()
        vi.spyOn(repository, "findUserByUsername").mockRejectedValue(new Error("private database detail"))

        const response = await request(createAuthTestApp(repository))
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`)
            .send({ username: TEST_CREDENTIALS.username, password: TEST_CREDENTIALS.password })

        expect(response.status).toBe(500)
        expect(response.body.error).toMatchObject({
            code: ERROR_CODES.INTERNAL,
            message: "Internal server error",
            requestId: expect.any(String),
        })
        expect(JSON.stringify(response.body)).not.toContain("private database detail")
    })
})

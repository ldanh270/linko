import { ERROR_CODES } from "@linko/contracts"
import express from "express"
import request from "supertest"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { createApp } from "../../app"
import validate from "../../middlewares/validate.middleware"
import type { AuthRuntimeConfig } from "../../configs/auth.config"
import { BusinessException } from "../errors/BusinessException"
import { createLogger, type LogRecord } from "../logger/logger"

const TEST_AUTH_CONFIG: AuthRuntimeConfig = {
    accessTokenSecret: "test-secret-with-enough-entropy-for-linko-auth",
    clientOrigin: "http://localhost:3000",
    refreshCookie: { path: "/", secure: false, sameSite: "lax" },
}

const createTestApp = () => {
    const records: LogRecord[] = []
    const publicRoutes = express.Router()
    const privateRoutes = express.Router()
    const app = createApp({
        publicRoutes,
        privateRoutes,
        logger: createLogger((record) => records.push(record)),
        authConfig: TEST_AUTH_CONFIG,
    })
    return { app, publicRoutes, records }
}

describe("HTTP boundary", () => {
    it("allows only the configured credentialed browser origin", async () => {
        const { app, publicRoutes } = createTestApp()
        publicRoutes.get("/cors", (_request, response) => response.sendStatus(204))

        const configuredOriginResponse = await request(app)
            .get("/cors")
            .set("Origin", TEST_AUTH_CONFIG.clientOrigin)
        const unconfiguredOriginResponse = await request(app)
            .get("/cors")
            .set("Origin", "https://attacker.example")

        expect(configuredOriginResponse.headers["access-control-allow-origin"]).toBe(TEST_AUTH_CONFIG.clientOrigin)
        expect(configuredOriginResponse.headers["access-control-allow-credentials"]).toBe("true")
        expect(unconfiguredOriginResponse.headers["access-control-allow-origin"]).toBe(TEST_AUTH_CONFIG.clientOrigin)
    })

    it("returns a business error without logging it", async () => {
        const { app, publicRoutes, records } = createTestApp()
        publicRoutes.get("/business", () => {
            throw new BusinessException(ERROR_CODES.CONFLICT, 409, "Already exists")
        })

        const response = await request(app).get("/business")

        expect(response.status).toBe(409)
        expect(response.body).toEqual({
            success: false,
            data: null,
            error: { code: "CONFLICT", message: "Already exists" },
            meta: null,
        })
        expect(records).toHaveLength(0)
    })

    it("returns a generic 500 with a request ID and one redacted structured log", async () => {
        const { app, publicRoutes, records } = createTestApp()
        publicRoutes.get("/technical", () => {
            throw new Error("password=secret-value Bearer token-value")
        })

        const response = await request(app).get("/technical")

        expect(response.status).toBe(500)
        expect(response.body.error).toEqual({
            code: "INTERNAL",
            message: "Internal server error",
            requestId: expect.any(String),
        })
        expect(records).toHaveLength(1)
        expect(records[0].requestId).toBe(response.body.error.requestId)
        expect(records[0].stack).toContain("Error:")
        expect(JSON.stringify(records[0])).not.toContain("secret-value")
        expect(JSON.stringify(records[0])).not.toContain("token-value")
    })

    it("redacts quoted and JSON-formatted secrets in technical errors", async () => {
        const { app, publicRoutes, records } = createTestApp()
        publicRoutes.get("/quoted-secrets", () => {
            throw new Error('password: "secret with spaces" {"token":"json-secret"} refreshToken=refresh-secret')
        })

        const response = await request(app).get("/quoted-secrets")

        expect(response.status).toBe(500)
        expect(records).toHaveLength(1)
        expect(JSON.stringify(records[0])).not.toContain("secret with spaces")
        expect(JSON.stringify(records[0])).not.toContain("json-secret")
        expect(JSON.stringify(records[0])).not.toContain("refresh-secret")
    })

    it("maps malformed JSON to a safe 400 without technical logging", async () => {
        const { app, publicRoutes, records } = createTestApp()
        publicRoutes.post("/payload", (_request, response) => response.sendStatus(204))

        const response = await request(app)
            .post("/payload")
            .set("Content-Type", "application/json")
            .send('{"invalid":')

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe("MALFORMED_JSON")
        expect(records).toHaveLength(0)
    })

    it("maps Zod validation failures to the shared 400 envelope", async () => {
        const { app, publicRoutes, records } = createTestApp()
        publicRoutes.post(
            "/validated",
            validate(z.object({ body: z.object({ name: z.string().min(1) }) })),
            (_request, response) => response.sendStatus(204),
        )

        const response = await request(app).post("/validated").send({ name: "" })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe("VALIDATION")
        expect(records).toHaveLength(0)
    })

    it("maps invalid JWTs to a stable 401 without technical logging", async () => {
        const records: LogRecord[] = []
        const privateRoutes = express.Router()
        privateRoutes.get("/private", (_request, response) => response.sendStatus(204))
        const app = createApp({
            publicRoutes: express.Router(),
            privateRoutes,
            logger: createLogger((record) => records.push(record)),
            authConfig: TEST_AUTH_CONFIG,
        })

        const response = await request(app)
            .get("/private")
            .set("Authorization", "Bearer invalid-token")

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("INVALID_TOKEN")
        expect(records).toHaveLength(0)
    })
})

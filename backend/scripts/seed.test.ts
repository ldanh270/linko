import {
    API_ROUTES,
    AUTH_ROUTE_PATHS,
    CONVERSATION_ROUTE_PATHS,
    CURSOR_PAGE_FIELDS,
    INBOX_FIELDS,
    MESSAGE_FIELDS,
} from "@linko/contracts"
import cookieParser from "cookie-parser"
import express, { type Express } from "express"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import mongoose from "mongoose"
import { spawn } from "node:child_process"
import { resolve } from "node:path"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createAuthenticate } from "../src/middlewares/route.middleware"
import Conversation from "../src/models/Conversation"
import FriendRequest from "../src/models/FriendRequest"
import Friendship from "../src/models/Friendship"
import Message from "../src/models/Message"
import Session from "../src/models/Session"
import User from "../src/models/User"
import { AUTH_COOKIE_NAME, AUTH_FIELDS } from "../src/modules/auth/auth.constants"
import { AuthController } from "../src/modules/auth/auth.controller"
import { MongooseAuthRepository } from "../src/modules/auth/auth.repository"
import { createAuthRouter } from "../src/modules/auth/auth.route"
import { AuthTokenService, BcryptPasswordHasher } from "../src/modules/auth/auth.security"
import { AuthService } from "../src/modules/auth/auth.service"
import type { AuthCookieConfiguration } from "../src/modules/auth/auth.types"
import { CONVERSATION_FIELDS } from "../src/modules/conversation/conversation.constants"
import {
    DIRECT_CONVERSATION_FIELDS,
    FRIEND_REQUEST_MODEL_FIELDS,
} from "../src/modules/friend/friend.constants"
import { InboxController } from "../src/modules/inbox/inbox.controller"
import { MongooseInboxRepository } from "../src/modules/inbox/inbox.repository"
import { createInboxRouter } from "../src/modules/inbox/inbox.route"
import { InboxService } from "../src/modules/inbox/inbox.service"
import { MESSAGE_MODEL_FIELDS } from "../src/modules/message/message.constants"
import { createLogger } from "../src/shared/logger/logger"
import { createGlobalErrorHandler } from "../src/shared/middlewares/globalErrorHandler"
import { withRequestContext } from "../src/shared/middlewares/requestContext"
import { withTransaction } from "../src/shared/persistence/withTransaction"

const DEMO_CREDENTIALS = {
    username: "demo_an",
    password: "LinkoDemo123!",
} as const
const DATABASE_NAME = "linko_demo_seed_test"
const TEST_TOKEN_SECRET = "test-secret-with-enough-entropy-for-demo-seed"
const TEST_COOKIE_CONFIGURATION: AuthCookieConfiguration = {
    path: "/",
    secure: false,
    sameSite: "lax",
}

let replicaSet: MongoMemoryReplSet
let databaseUri: string

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: "wiredTiger" },
    })
    databaseUri = replicaSet.getUri(DATABASE_NAME)
    await mongoose.connect(databaseUri)
    await Promise.all([
        User.init(),
        Friendship.init(),
        FriendRequest.init(),
        Conversation.init(),
        Message.init(),
        Session.init(),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("local demo seeder", () => {
    it("creates complete data that the demo account can load after login", async () => {
        const firstRun = await runSeeder()
        const secondRun = await runSeeder()

        expect(firstRun).toContain("Demo data ready")
        expect(secondRun).toContain("users: 0")
        expect(await User.countDocuments()).toBe(4)
        expect(await Friendship.countDocuments()).toBe(3)
        expect(await FriendRequest.countDocuments()).toBe(1)
        expect(await Conversation.countDocuments()).toBe(2)
        expect(await Message.countDocuments()).toBe(7)

        const demoUser = await User.findOne({ [AUTH_FIELDS.USERNAME]: DEMO_CREDENTIALS.username })
        const demoFriendRequest = await FriendRequest.findOne({
            [FRIEND_REQUEST_MODEL_FIELDS.FROM]: "000000000000000000000004",
            [FRIEND_REQUEST_MODEL_FIELDS.TO]: "000000000000000000000001",
        }).lean()
        const directConversation = await Conversation.findOne({
            [CONVERSATION_FIELDS.TYPE]: "DIRECT",
        }).lean()
        const messages = await Message.find().lean()

        expect(demoUser).not.toBeNull()
        expect(demoFriendRequest?.[FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_A]).toBeDefined()
        expect(demoFriendRequest?.[FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_B]).toBeDefined()
        expect(directConversation?.[DIRECT_CONVERSATION_FIELDS.USER_A]).toBeDefined()
        expect(directConversation?.[DIRECT_CONVERSATION_FIELDS.USER_B]).toBeDefined()
        expect(
            messages.every(
                (message) => typeof message[MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID] === "string",
            ),
        ).toBe(true)

        const app = createDemoTestApp()
        const loginResponse = await request(app)
            .post(`${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`)
            .send(DEMO_CREDENTIALS)
        const accessToken: string = loginResponse.body.data.accessToken
        const inboxResponse = await request(app)
            .get(`${API_ROUTES.CONVERSATIONS}${CONVERSATION_ROUTE_PATHS.ROOT}`)
            .set("Authorization", `Bearer ${accessToken}`)

        expect(loginResponse.status).toBe(200)
        expect(loginResponse.headers["set-cookie"]).toEqual(
            expect.arrayContaining([expect.stringContaining(`${AUTH_COOKIE_NAME}=`)]),
        )
        expect(inboxResponse.status).toBe(200)
        expect(inboxResponse.body.data[CURSOR_PAGE_FIELDS.ITEMS]).toHaveLength(2)
        expect(
            inboxResponse.body.data[CURSOR_PAGE_FIELDS.ITEMS].map(
                (item: Record<string, unknown>) => item[INBOX_FIELDS.LAST_MESSAGE],
            ),
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ [MESSAGE_FIELDS.CONTENT]: "Gửi địa chỉ cho mình nhé!" }),
                expect.objectContaining({
                    [MESSAGE_FIELDS.CONTENT]: "Chốt thứ bảy, mình gửi lịch trình sau!",
                }),
            ]),
        )
    })
})

/** Run the same guarded CLI command developers use, against the isolated test database. */
function runSeeder(): Promise<string> {
    return new Promise((resolveOutput, reject) => {
        const child = spawn(
            process.execPath,
            ["--import", "tsx", resolve(process.cwd(), "scripts/seed.ts")],
            {
                cwd: process.cwd(),
                env: { ...process.env, NODE_ENV: "test", MONGODB_CONNECTION_STRING: databaseUri },
                stdio: ["pipe", "pipe", "pipe"],
            },
        )
        let output = ""
        const timeout = setTimeout(() => child.kill(), 20_000)

        child.stdout.on("data", (chunk: Buffer) => {
            output += chunk.toString()
        })
        child.stderr.on("data", (chunk: Buffer) => {
            output += chunk.toString()
        })
        child.stdin.on("error", () => undefined)
        child.on("error", reject)
        child.on("close", (code) => {
            clearTimeout(timeout)
            if (code === 0) resolveOutput(output)
            else reject(new Error(`Seeder exited with code ${String(code)}:\n${output}`))
        })
        child.stdin.end(`${DATABASE_NAME}\n`)
    })
}

/** Compose the real login and inbox routes around the in-memory integration database. */
function createDemoTestApp(): Express {
    const tokenService = new AuthTokenService(TEST_TOKEN_SECRET)
    const authService = new AuthService({
        repository: new MongooseAuthRepository(),
        passwordHasher: new BcryptPasswordHasher(),
        tokenProvider: tokenService,
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date() },
    })
    const inboxService = new InboxService({ repository: new MongooseInboxRepository() })
    const app = express()
    app.use(withRequestContext)
    app.use(express.json())
    app.use(cookieParser())
    app.use(
        API_ROUTES.AUTH,
        createAuthRouter(new AuthController(authService, TEST_COOKIE_CONFIGURATION)),
    )
    app.use(createAuthenticate(TEST_TOKEN_SECRET))
    app.use(API_ROUTES.CONVERSATIONS, createInboxRouter(new InboxController(inboxService)))
    app.use(createGlobalErrorHandler(createLogger(() => undefined)))
    return app
}

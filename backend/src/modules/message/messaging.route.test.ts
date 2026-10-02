import {
    API_ROUTES,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    MESSAGE_FIELDS,
    MESSAGE_LIMITS,
    MESSAGE_PARAMS,
    MESSAGE_QUERY_PARAMS,
    MESSAGE_ROUTE_PATHS,
    ROLE,
} from "@linko/contracts"
import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { createApp } from "../../app"
import Conversation from "../../models/Conversation"
import Friendship from "../../models/Friendship"
import Message from "../../models/Message"
import User from "../../models/User"
import { AuthTokenService } from "../auth/auth.security"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { createLogger } from "../../shared/logger/logger"
import { MESSAGE_MODEL_FIELDS } from "./message.constants"

const TEST_TOKEN_SECRET = "messaging-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const SAME_MESSAGE_TIME = new Date("2026-10-04T12:00:00.000Z")
const MEMBERSHIP_START_TIME = new Date("2026-10-04T10:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "messaging-route-test" })
    await Promise.all([Conversation.init(), Friendship.init(), Message.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([
        Conversation.collection.deleteMany({}),
        Friendship.collection.deleteMany({}),
        Message.collection.deleteMany({}),
        User.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("message HTTP routes", () => {
    it("should_reject_message_content_above_the_contract_limit", async () => {
        const owner = await createAccount("too-long-owner")
        const conversationId = await createGroup(owner._id)

        const response = await request(createTestApp())
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${owner.token}`)
            .send(sendBody(conversationId, "too-long", "x".repeat(MESSAGE_LIMITS.MAX_CONTENT_LENGTH + 1)))

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_require_authentication_and_current_group_membership", async () => {
        const owner = await createAccount("auth-owner")
        const outsider = await createAccount("auth-outsider")
        const conversationId = await createGroup(owner._id)
        const app = createTestApp()

        const unauthenticated = await request(app).get(messagePath(conversationId.toString()))
        const nonmember = await request(app)
            .get(messagePath(conversationId.toString()))
            .set("Authorization", `Bearer ${outsider.token}`)

        expect(unauthenticated.status).toBe(401)
        expect(unauthenticated.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
        expect(nonmember.status).toBe(403)
        expect(nonmember.body.error.code).toBe(ERROR_CODES.FORBIDDEN)
    })

    it("should_page_messages_with_a_stable_created_at_and_id_cursor", async () => {
        const owner = await createAccount("cursor-owner")
        const conversationId = await createGroup(owner._id)
        await Promise.all([
            "507f1f77bcf86cd799439101",
            "507f1f77bcf86cd799439102",
            "507f1f77bcf86cd799439103",
        ].map((messageId, index) => insertMessage(
            new mongoose.Types.ObjectId(messageId),
            conversationId,
            owner._id,
            `message-${index + 1}`,
            `cursor-${index + 1}`,
            SAME_MESSAGE_TIME,
        )))
        const app = createTestApp()

        const firstPage = await request(app)
            .get(messagePath(conversationId.toString(), { limit: "2" }))
            .set("Authorization", `Bearer ${owner.token}`)
        const nextCursor = firstPage.body.data.nextCursor as string
        const secondPage = await request(app)
            .get(messagePath(conversationId.toString(), { limit: "2", cursor: nextCursor }))
            .set("Authorization", `Bearer ${owner.token}`)

        expect(firstPage.status).toBe(200)
        expect(firstPage.body.data.items.map((message: { id: string }) => message.id)).toEqual([
            "507f1f77bcf86cd799439102",
            "507f1f77bcf86cd799439103",
        ])
        expect(typeof nextCursor).toBe("string")
        expect(secondPage.status).toBe(200)
        expect(secondPage.body.data.items.map((message: { id: string }) => message.id)).toEqual([
            "507f1f77bcf86cd799439101",
        ])
        expect(secondPage.body.data.nextCursor).toBeNull()
    })

    it("should_require_friendship_when_sending_by_an_existing_direct_conversation_id", async () => {
        const sender = await createAccount("direct-sender")
        const peer = await createAccount("direct-peer")
        const conversationId = await createDirectConversation(sender._id, peer._id)

        const response = await request(createTestApp())
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .send(sendBody(conversationId, "former-friend-message", "Hello"))

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.FRIENDSHIP_REQUIRED)
        expect(await Message.countDocuments({})).toBe(0)
    })

    it("should_block_new_messages_when_a_group_is_closed", async () => {
        const owner = await createAccount("closed-owner")
        const conversationId = await createGroup(owner._id, CONVERSATION_STATUS.CLOSED)

        const response = await request(createTestApp())
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${owner.token}`)
            .send(sendBody(conversationId, "closed-group-message", "No new message"))

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe(ERROR_CODES.GROUP_CLOSED)
        expect(await Message.countDocuments({ [MESSAGE_FIELDS.CONVERSATION_ID]: conversationId })).toBe(0)
    })
})

/** Build the application with its production composition root and isolated auth config. */
function createTestApp() {
    return createApp({
        publicRoutes: express.Router(),
        privateRoutes: express.Router(),
        logger: createLogger(() => undefined),
        authConfig: {
            accessTokenSecret: TEST_TOKEN_SECRET,
            clientOrigin: "https://linko.example",
            refreshCookie: { path: "/", secure: false, sameSite: "lax" },
        },
    })
}

/** Create one authenticated user for endpoint authorization tests. */
async function createAccount(suffix: string): Promise<{
    readonly _id: mongoose.Types.ObjectId
    readonly token: string
}> {
    const user = await User.create({
        username: `messaging_route_${suffix}`,
        email: `messaging_route_${suffix}@example.com`,
        displayName: `Messaging ${suffix}`,
        hashedPassword: "messaging-route-test-hash",
    })
    return {
        _id: user._id,
        token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()),
    }
}

/** Persist an active group with its creator as the only current member. */
async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    status: (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS] = CONVERSATION_STATUS.ACTIVE,
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: status,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [{
            [PARTICIPANT_FIELDS.USER_ID]: ownerId,
            [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
            [PARTICIPANT_FIELDS.JOINED_AT]: MEMBERSHIP_START_TIME,
        }],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Messaging route test",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

/** Persist an existing direct conversation so send authorization cannot rely on recipient creation. */
async function createDirectConversation(
    firstUserId: mongoose.Types.ObjectId,
    secondUserId: mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [firstUserId, secondUserId].map((userId) => ({
            [PARTICIPANT_FIELDS.USER_ID]: userId,
            [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT,
        })),
    })
    return conversation._id
}

/** Build the content-only send request using shared contract fields. */
function sendBody(conversationId: mongoose.Types.ObjectId, clientMessageId: string, content: string) {
    return {
        [MESSAGE_FIELDS.CONVERSATION_ID]: conversationId.toString(),
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: clientMessageId,
        [MESSAGE_FIELDS.CONTENT]: content,
    }
}

/** Persist a message at a controlled timestamp for compound-cursor coverage. */
async function insertMessage(
    id: mongoose.Types.ObjectId,
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    content: string,
    clientMessageId: string,
    createdAt: Date,
): Promise<void> {
    await Message.collection.insertOne({
        _id: id,
        [MESSAGE_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: clientMessageId,
        [MESSAGE_FIELDS.CONTENT]: content,
        [MESSAGE_FIELDS.CREATED_AT]: createdAt,
        [MESSAGE_FIELDS.UPDATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.DEL_FLAG]: false,
    })
}

/** Build the list route URL with validated query parameters. */
function messagePath(
    conversationId: string,
    query: Partial<Record<typeof MESSAGE_QUERY_PARAMS[keyof typeof MESSAGE_QUERY_PARAMS], string>> = {},
): string {
    const path = MESSAGE_ROUTE_PATHS.BY_CONVERSATION.replace(
        `:${MESSAGE_PARAMS.CONVERSATION_ID}`,
        conversationId,
    )
    const parameters = new URLSearchParams()
    if (query.limit) parameters.set(MESSAGE_QUERY_PARAMS.LIMIT, query.limit)
    if (query.cursor) parameters.set(MESSAGE_QUERY_PARAMS.CURSOR, query.cursor)
    const search = parameters.toString()
    return `${API_ROUTES.MESSAGES}${path}${search ? `?${search}` : ""}`
}

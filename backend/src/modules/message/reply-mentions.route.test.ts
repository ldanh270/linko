import {
    API_ROUTES,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    MESSAGE_FIELDS,
    ROLE,
} from "@linko/contracts"
import express from "express"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import request from "supertest"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { createApp } from "../../app"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import User from "../../models/User"
import { AuthTokenService } from "../auth/auth.security"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { createLogger } from "../../shared/logger/logger"
import { MESSAGE_MODEL_FIELDS } from "./message.constants"

const TEST_TOKEN_SECRET = "reply-mentions-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const MEMBERSHIP_START_TIME = new Date("2026-10-04T10:00:00.000Z")
const MESSAGE_TIME = new Date("2026-10-04T12:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "reply-mentions-route-test" })
    await Promise.all([Conversation.init(), Message.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([
        Conversation.collection.deleteMany({}),
        Message.collection.deleteMany({}),
        User.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("reply and mention HTTP routes", () => {
    it("should_reject_a_malformed_reply_object_id", async () => {
        const sender = await createAccount("invalid-reply-id")
        const conversationId = await createGroup(sender._id)

        const response = await request(createTestApp())
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .send(sendBody(conversationId, "invalid-reply-id", { [MESSAGE_FIELDS.REPLY_TO]: "not-an-object-id" }))

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_forbid_reply_to_a_message_outside_the_visible_conversation", async () => {
        const sender = await createAccount("cross-conversation-reply")
        const otherOwner = await createAccount("cross-conversation-owner")
        const conversationId = await createGroup(sender._id)
        const otherConversationId = await createGroup(otherOwner._id)
        const target = await insertMessage(otherConversationId, otherOwner._id, "Private target content")

        const response = await request(createTestApp())
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .send(sendBody(conversationId, "cross-conversation-reply", {
                [MESSAGE_FIELDS.REPLY_TO]: target._id.toString(),
            }))

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe(ERROR_CODES.INVALID_REPLY)
        expect(await Message.countDocuments({ [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: "cross-conversation-reply" }))
            .toBe(0)
    })

    it("should_return_unique_mentions_without_copying_reply_content_into_the_dto", async () => {
        const sender = await createAccount("safe-reply-dto")
        const conversationId = await createGroup(sender._id)
        const target = await insertMessage(conversationId, sender._id, "Private target content")

        const response = await request(createTestApp())
            .post(API_ROUTES.MESSAGES)
            .set("Authorization", `Bearer ${sender.token}`)
            .send(sendBody(conversationId, "safe-reply-dto", {
                [MESSAGE_FIELDS.REPLY_TO]: target._id.toString(),
                [MESSAGE_FIELDS.MENTIONS]: [sender._id.toString(), sender._id.toString()],
            }))

        expect(response.status).toBe(201)
        expect(response.body.data[MESSAGE_FIELDS.REPLY_TO]).toBe(target._id.toString())
        expect(response.body.data[MESSAGE_FIELDS.MENTIONS]).toEqual([sender._id.toString()])
        expect(JSON.stringify(response.body.data)).not.toContain("Private target content")
    })
})

/** Build the application through its production composition root with isolated auth config. */
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
        username: `reply_route_${suffix}`,
        email: `reply_route_${suffix}@example.com`,
        displayName: `Reply Route ${suffix}`,
        hashedPassword: "reply-route-test-hash",
    })
    return {
        _id: user._id,
        token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()),
    }
}

/** Persist a group with its creator as the only current member. */
async function createGroup(ownerId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [{
            [PARTICIPANT_FIELDS.USER_ID]: ownerId,
            [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
            [PARTICIPANT_FIELDS.JOINED_AT]: MEMBERSHIP_START_TIME,
        }],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Reply mention route test",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

/** Create a valid send body and apply the reply or mention fields under test. */
function sendBody(
    conversationId: mongoose.Types.ObjectId,
    clientMessageId: string,
    metadata: Readonly<Record<string, unknown>> = {},
) {
    return {
        [MESSAGE_FIELDS.CONVERSATION_ID]: conversationId.toString(),
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: clientMessageId,
        [MESSAGE_FIELDS.CONTENT]: "A new message",
        ...metadata,
    }
}

/** Persist an existing message at the time used by reply visibility checks. */
async function insertMessage(
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    content: string,
): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return Message.create({
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_MODEL_FIELDS.CONTENT]: content,
        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: new mongoose.Types.ObjectId().toString(),
        [MESSAGE_MODEL_FIELDS.CREATED_AT]: MESSAGE_TIME,
        [MESSAGE_MODEL_FIELDS.UPDATED_AT]: MESSAGE_TIME,
    })
}

import { createHash, randomBytes, randomUUID } from "node:crypto"

import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    CONVERSATION_ROUTE_PATHS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    INVITATION_PARAMS,
    INVITATION_PREVIEW_ROUTE_PATHS,
    MESSAGE_FIELDS,
    READ_REQUEST_FIELDS,
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
import Invitation from "../invitation/Invitation"
import { INVITATION_MODEL_FIELDS } from "../invitation/invitation.constants"
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import { createLogger } from "../../shared/logger/logger"

const TEST_TOKEN_SECRET = "read-state-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const MEMBERSHIP_START_TIME = new Date("2026-10-03T10:00:00.000Z")
const DEPARTED_AT = new Date("2026-10-03T11:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "read-state-route-test" })
    await Promise.all([Conversation.init(), Invitation.init(), Message.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([
        Conversation.collection.deleteMany({}),
        Invitation.collection.deleteMany({}),
        Message.collection.deleteMany({}),
        User.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("read-state HTTP routes", () => {
    it("should_require_authentication_and_current_membership", async () => {
        const owner = await createAccount("auth-owner")
        const outsider = await createAccount("auth-outsider")
        const conversationId = await createGroup(owner._id)
        const app = createTestApp()

        const unauthenticated = await request(app).put(readPath(conversationId.toString())).send(readBody(new mongoose.Types.ObjectId()))
        const nonmember = await request(app)
            .put(readPath(conversationId.toString()))
            .set("Authorization", `Bearer ${outsider.token}`)
            .send(readBody(new mongoose.Types.ObjectId()))

        expect(unauthenticated.status).toBe(401)
        expect(unauthenticated.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED)
        expect(nonmember.status).toBe(403)
        expect(nonmember.body.error.code).toBe(ERROR_CODES.FORBIDDEN)
    })

    it("should_reject_an_invalid_message_id", async () => {
        const owner = await createAccount("invalid-owner")
        const conversationId = await createGroup(owner._id)

        const response = await request(createTestApp())
            .put(readPath(conversationId.toString()))
            .set("Authorization", `Bearer ${owner.token}`)
            .send({ [READ_REQUEST_FIELDS.LAST_VISIBLE_MESSAGE_ID]: "not-an-object-id" })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_reject_a_message_from_another_conversation", async () => {
        const owner = await createAccount("wrong-conversation-owner")
        const [conversationId, otherConversationId] = await Promise.all([
            createGroup(owner._id),
            createGroup(owner._id),
        ])
        const messageId = new mongoose.Types.ObjectId()
        await insertMessage(messageId, otherConversationId, owner._id)

        const response = await request(createTestApp())
            .put(readPath(conversationId.toString()))
            .set("Authorization", `Bearer ${owner.token}`)
            .send(readBody(messageId))

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION)
    })

    it("should_return_the_read_state_in_the_success_envelope", async () => {
        const owner = await createAccount("success-owner")
        const conversationId = await createGroup(owner._id)
        const messageId = new mongoose.Types.ObjectId()
        await insertMessage(messageId, conversationId, owner._id)

        const response = await request(createTestApp())
            .put(readPath(conversationId.toString()))
            .set("Authorization", `Bearer ${owner.token}`)
            .send(readBody(messageId))

        expect(response.status).toBe(200)
        expect(response.body).toMatchObject({
            success: true,
            data: {
                conversationId: conversationId.toString(),
                lastReadMessageId: messageId.toString(),
                unreadCount: 0,
            },
            error: null,
        })
        expect(response.body.data.lastReadAt).toEqual(expect.any(String))
    })

    it("should_start_with_fresh_read_state_after_an_invitation_rejoin", async () => {
        const owner = await createAccount("rejoin-owner")
        const member = await createAccount("rejoin-member")
        const conversationId = await createGroup(owner._id, member._id)
        const previousReadMessageId = new mongoose.Types.ObjectId()
        await Conversation.updateOne(
            {
                [CONVERSATION_FIELDS.ID]: conversationId,
                [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.USER_ID}`]: member._id,
            },
            {
                $set: {
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.DEL_FLAG}`]: true,
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.LEFT_AT}`]: DEPARTED_AT,
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.LAST_READ_AT}`]: MEMBERSHIP_START_TIME,
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.$.${PARTICIPANT_FIELDS.LAST_READ_MESSAGE_ID}`]: previousReadMessageId,
                    [`${CONVERSATION_FIELDS.UNREAD_COUNT}.${member._id.toString()}`]: 4,
                },
            },
        )
        const invitation = await createInvitation(conversationId)

        const response = await request(createTestApp())
            .post(acceptPath(invitation.rawToken))
            .set("Authorization", `Bearer ${member.token}`)
            .send({})
        const conversation = await Conversation.findById(conversationId)
        const rejoinedParticipant = conversation?.[CONVERSATION_FIELDS.PARTICIPANTS].find((participant) =>
            participant[PARTICIPANT_FIELDS.USER_ID].equals(member._id)
                && participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true,
        )

        expect(response.status).toBe(200)
        expect(rejoinedParticipant?.[PARTICIPANT_FIELDS.JOINED_AT]?.getTime()).toBeGreaterThan(DEPARTED_AT.getTime())
        expect(rejoinedParticipant?.[PARTICIPANT_FIELDS.LAST_READ_AT]).toBeNull()
        expect(rejoinedParticipant?.[PARTICIPANT_FIELDS.LAST_READ_MESSAGE_ID]).toBeNull()
        expect(conversation?.[CONVERSATION_FIELDS.UNREAD_COUNT].get(member._id.toString())).toBe(0)
    })
})

/** Compose the production route graph with an isolated JWT secret and logger. */
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

/** Create one user and a signed access token for authenticated route requests. */
async function createAccount(suffix: string): Promise<{
    readonly _id: mongoose.Types.ObjectId
    readonly token: string
}> {
    const user = await User.create({
        username: `read_route_${suffix}`,
        email: `read_route_${suffix}@example.com`,
        displayName: `Read ${suffix}`,
        hashedPassword: "read-state-route-test-hash",
    })
    return {
        _id: user._id,
        token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()),
    }
}

/** Persist a group containing an owner and an optional second participant. */
async function createGroup(
    ownerId: mongoose.Types.ObjectId,
    memberId?: mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId> {
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            {
                [PARTICIPANT_FIELDS.USER_ID]: ownerId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
                [PARTICIPANT_FIELDS.JOINED_AT]: MEMBERSHIP_START_TIME,
            },
            ...(memberId ? [{
                [PARTICIPANT_FIELDS.USER_ID]: memberId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
                [PARTICIPANT_FIELDS.JOINED_AT]: MEMBERSHIP_START_TIME,
            }] : []),
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: "Read-state route test",
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return conversation._id
}

/** Persist a visible message with a timestamp after the fixed fixture membership start. */
async function insertMessage(
    id: mongoose.Types.ObjectId,
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
): Promise<void> {
    const createdAt = new Date()
    await Message.collection.insertOne({
        _id: id,
        [MESSAGE_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: `route-${id.toString()}`,
        [MESSAGE_FIELDS.CONTENT]: "Visible message",
        [MESSAGE_FIELDS.CREATED_AT]: createdAt,
        [MESSAGE_FIELDS.UPDATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.DEL_FLAG]: false,
    })
}

/** Persist an invitation that the production acceptance route can consume. */
async function createInvitation(conversationId: mongoose.Types.ObjectId): Promise<{ readonly rawToken: string }> {
    const rawToken = randomBytes(32).toString("base64url")
    await Invitation.create({
        [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [INVITATION_MODEL_FIELDS.TOKEN_HASH]: createHash("sha256").update(rawToken).digest("hex"),
        [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: createHash("sha256").update(randomUUID()).digest("hex"),
    })
    return { rawToken }
}

/** Build one read-cursor endpoint URL using the shared route contract. */
function readPath(conversationId: string): string {
    const route = CONVERSATION_ROUTE_PATHS.READ.replace(`:${CONVERSATION_PARAMS.ID}`, conversationId)
    return `${API_ROUTES.CONVERSATIONS}${route}`
}

/** Build the authenticated invitation acceptance endpoint for one raw token. */
function acceptPath(token: string): string {
    const route = INVITATION_PREVIEW_ROUTE_PATHS.ACCEPT.replace(`:${INVITATION_PARAMS.TOKEN}`, token)
    return `${API_ROUTES.INVITATIONS}${route}`
}

/** Shape the shared last-visible-message request with a persisted ObjectId. */
function readBody(messageId: mongoose.Types.ObjectId) {
    return { [READ_REQUEST_FIELDS.LAST_VISIBLE_MESSAGE_ID]: messageId.toString() }
}

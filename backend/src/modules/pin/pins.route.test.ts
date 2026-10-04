import {
    API_ROUTES,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    PIN_PARAMS,
    PIN_ROUTE_PATHS,
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
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import { createLogger } from "../../shared/logger/logger"

const TEST_TOKEN_SECRET = "pin-route-tests-use-a-sufficiently-long-secret"
const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const OWNER_JOINED_AT = new Date("2026-10-04T10:00:00.000Z")
const MEMBER_JOINED_AT = new Date("2026-10-04T12:00:00.000Z")
const OLD_MESSAGE_TIME = new Date("2026-10-04T11:00:00.000Z")
const VISIBLE_MESSAGE_TIME = new Date("2026-10-04T13:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "pins-route-test" })
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

describe("pin HTTP routes", () => {
    it("should_require_authentication_and_current_membership", async () => {
        const group = await createGroup("pin-auth")
        const app = createTestApp()

        const unauthenticated = await request(app).get(listPath(group.conversationId.toString()))
        const outsider = await createAccount("pin-outsider")
        const nonmember = await request(app)
            .get(listPath(group.conversationId.toString()))
            .set("Authorization", `Bearer ${outsider.token}`)

        expect(unauthenticated.status).toBe(401)
        expect(nonmember.status).toBe(403)
        expect(nonmember.body.error.code).toBe(ERROR_CODES.FORBIDDEN)
    })

    it("should_return_a_404_when_the_message_belongs_to_another_conversation", async () => {
        const firstGroup = await createGroup("wrong-group-a")
        const secondGroup = await createGroup("wrong-group-b")
        const message = await createMessage(secondGroup.conversationId, secondGroup.owner._id, VISIBLE_MESSAGE_TIME)

        const response = await request(createTestApp())
            .put(pinPath(firstGroup.conversationId.toString(), message._id.toString()))
            .set("Authorization", `Bearer ${firstGroup.owner.token}`)

        expect(response.status).toBe(404)
        expect(response.body.error.code).toBe(ERROR_CODES.NOT_FOUND)
    })

    it("should_reject_a_regular_member_pin_and_pins_in_direct_conversations", async () => {
        const group = await createGroup("role-check")
        const groupMessage = await createMessage(group.conversationId, group.owner._id, VISIBLE_MESSAGE_TIME)
        const memberResponse = await request(createTestApp())
            .put(pinPath(group.conversationId.toString(), groupMessage._id.toString()))
            .set("Authorization", `Bearer ${group.member.token}`)
        const direct = await createDirectConversation(group.owner._id, group.member._id)
        const directMessage = await createMessage(direct._id, group.owner._id, VISIBLE_MESSAGE_TIME)
        const directResponse = await request(createTestApp())
            .put(pinPath(direct._id.toString(), directMessage._id.toString()))
            .set("Authorization", `Bearer ${group.owner.token}`)

        expect(memberResponse.status).toBe(403)
        expect(memberResponse.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_ROLE)
        expect(directResponse.status).toBe(403)
        expect(directResponse.body.error.code).toBe(ERROR_CODES.FORBIDDEN)
    })

    it("should_pin_idempotently_and_return_newest_pins_first", async () => {
        const group = await createGroup("pin-order")
        const earlier = await createMessage(group.conversationId, group.owner._id, new Date(VISIBLE_MESSAGE_TIME.getTime() - 1))
        const later = await createMessage(group.conversationId, group.owner._id, VISIBLE_MESSAGE_TIME)
        const app = createTestApp()

        await request(app)
            .put(pinPath(group.conversationId.toString(), earlier._id.toString()))
            .set("Authorization", `Bearer ${group.owner.token}`)
        const firstPin = await request(app)
            .put(pinPath(group.conversationId.toString(), later._id.toString()))
            .set("Authorization", `Bearer ${group.owner.token}`)
        const duplicatePin = await request(app)
            .put(pinPath(group.conversationId.toString(), later._id.toString()))
            .set("Authorization", `Bearer ${group.owner.token}`)

        expect(firstPin.status).toBe(200)
        expect(firstPin.body).toMatchObject({ success: true, data: [{ id: later._id.toString() }, { id: earlier._id.toString() }] })
        expect(duplicatePin.status).toBe(200)
        expect(duplicatePin.body.data).toHaveLength(2)
    })

    it("should_not_return_a_prejoin_pin_to_a_new_member", async () => {
        const group = await createGroup("pin-prejoin")
        const oldMessage = await createMessage(group.conversationId, group.owner._id, OLD_MESSAGE_TIME)
        const app = createTestApp()
        const pinned = await request(app)
            .put(pinPath(group.conversationId.toString(), oldMessage._id.toString()))
            .set("Authorization", `Bearer ${group.owner.token}`)
        const pins = await request(app)
            .get(listPath(group.conversationId.toString()))
            .set("Authorization", `Bearer ${group.member.token}`)

        expect(pinned.status).toBe(200)
        expect(pins.status).toBe(200)
        expect(pins.body.data).toEqual([])
        expect(JSON.stringify(pins.body)).not.toContain("Message to pin")
    })
})

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

async function createAccount(suffix: string): Promise<{
    readonly _id: mongoose.Types.ObjectId
    readonly token: string
}> {
    const user = await User.create({
        username: `pin_route_${suffix}`,
        email: `pin_route_${suffix}@example.com`,
        displayName: `Pin route ${suffix}`,
        hashedPassword: "pin-route-test-hash",
    })
    return { _id: user._id, token: new AuthTokenService(TEST_TOKEN_SECRET).createAccessToken(user._id.toString()) }
}

async function createGroup(suffix: string) {
    const owner = await createAccount(`${suffix}-owner`)
    const member = await createAccount(`${suffix}-member`)
    const participants = [{
        [PARTICIPANT_FIELDS.USER_ID]: owner._id,
        [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
        [PARTICIPANT_FIELDS.JOINED_AT]: OWNER_JOINED_AT,
    }, {
        [PARTICIPANT_FIELDS.USER_ID]: member._id,
        [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
        [PARTICIPANT_FIELDS.JOINED_AT]: MEMBER_JOINED_AT,
    }]
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
        [CONVERSATION_FIELDS.PARTICIPANTS]: participants,
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: `Group ${suffix}`,
            [GROUP_FIELDS.OWNER_ID]: owner._id,
        },
    })
    return { owner, member, conversationId: conversation._id }
}

async function createDirectConversation(ownerId: mongoose.Types.ObjectId, memberId: mongoose.Types.ObjectId) {
    return Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            { [PARTICIPANT_FIELDS.USER_ID]: ownerId, [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT },
            { [PARTICIPANT_FIELDS.USER_ID]: memberId, [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT },
        ],
    })
}

async function createMessage(
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    createdAt: Date,
) {
    return Message.create({
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: `pin-route-${new mongoose.Types.ObjectId().toString()}`,
        [MESSAGE_MODEL_FIELDS.CONTENT]: "Message to pin",
        [MESSAGE_MODEL_FIELDS.CREATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.UPDATED_AT]: createdAt,
    })
}

function listPath(conversationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${PIN_ROUTE_PATHS.LIST.replace(
        `:${PIN_PARAMS.CONVERSATION_ID}`,
        conversationId,
    )}`
}

function pinPath(conversationId: string, messageId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${PIN_ROUTE_PATHS.MESSAGE
        .replace(`:${PIN_PARAMS.CONVERSATION_ID}`, conversationId)
        .replace(`:${PIN_PARAMS.MESSAGE_ID}`, messageId)}`
}

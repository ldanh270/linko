import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    ROLE,
} from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import User from "../../models/User"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MongooseMessageRepository } from "./message.repository"
import { MessageService } from "./message.service"
import { MESSAGE_MODEL_FIELDS } from "./message.constants"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const MESSAGE_TIME = new Date("2026-10-04T12:00:00.000Z")
const MEMBER_JOINED_AT = new Date("2026-10-04T11:00:00.000Z")
const BEFORE_MEMBER_JOINED_AT = new Date("2026-10-04T10:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "messaging-service-test" })
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

describe("MessageService", () => {
    it("should_return_the_same_message_for_a_retried_client_message_id", async () => {
        const { memberId, conversationId } = await createGroup("idempotent-send")
        const service = createMessageService()
        const input = {
            conversationId,
            senderId: memberId,
            clientMessageId: "client-message-001",
            content: "A single stored message",
        }

        const first = await service.send(input)
        const retry = await service.send(input)

        expect(retry.id).toBe(first.id)
        expect(await Message.countDocuments({
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
            [MESSAGE_MODEL_FIELDS.SENDER_ID]: memberId,
            [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: input.clientMessageId,
        })).toBe(1)
    })

    it("should_hide_group_messages_created_before_the_current_join_time", async () => {
        const { ownerId, memberId, conversationId } = await createGroup("joined-history")
        await insertMessage(conversationId, ownerId, "old history", BEFORE_MEMBER_JOINED_AT, "old-history")
        await insertMessage(conversationId, ownerId, "visible history", MESSAGE_TIME, "visible-history")
        const service = createMessageService()

        const page = await service.list({ conversationId, userId: memberId, limit: 30 })

        expect(page.items.map(({ content }) => content)).toEqual(["visible history"])
        expect(page.items.every(({ createdAt }) => new Date(createdAt) >= MEMBER_JOINED_AT)).toBe(true)
    })

    it("should_reject_a_nonmember_from_reading_or_sending_messages", async () => {
        const { conversationId } = await createGroup("nonmember")
        const outsider = await createAccount("nonmember-outsider")
        const service = createMessageService()

        await expect(service.list({ conversationId, userId: outsider._id, limit: 30 }))
            .rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
        await expect(service.send({
            conversationId,
            senderId: outsider._id,
            clientMessageId: "outsider-message",
            content: "This must not be stored",
        })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    })

    it("should_reject_whitespace_only_message_content", async () => {
        const { memberId, conversationId } = await createGroup("blank-content")
        const service = createMessageService()

        await expect(service.send({
            conversationId,
            senderId: memberId,
            clientMessageId: "blank-message",
            content: " \t\n ",
        })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    })

    it("should_reject_sending_to_a_closed_group", async () => {
        const { memberId, conversationId } = await createGroup("closed-send")
        await Conversation.updateOne(
            { _id: conversationId },
            { $set: { [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.CLOSED } },
        )
        const service = createMessageService()

        await expect(service.send({
            conversationId,
            senderId: memberId,
            clientMessageId: "closed-message",
            content: "No messages after close",
        })).rejects.toMatchObject({ code: ERROR_CODES.GROUP_CLOSED })
    })
})

/** Construct the message domain service with real MongoDB transaction boundaries. */
function createMessageService(): MessageService {
    return new MessageService({
        repository: new MongooseMessageRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => MESSAGE_TIME },
    })
}

/** Create user records for one isolated service test. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return User.create({
        username: `message_${suffix}`,
        email: `message_${suffix}@example.com`,
        displayName: `Message ${suffix}`,
        hashedPassword: "message-test-hash",
    })
}

/** Persist an active group where the non-owner joined at the feature boundary time. */
async function createGroup(suffix: string): Promise<{
    readonly ownerId: mongoose.Types.ObjectId
    readonly memberId: mongoose.Types.ObjectId
    readonly conversationId: mongoose.Types.ObjectId
}> {
    const owner = await createAccount(`${suffix}-owner`)
    const member = await createAccount(`${suffix}-member`)
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            {
                [PARTICIPANT_FIELDS.USER_ID]: owner._id,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
                [PARTICIPANT_FIELDS.JOINED_AT]: new Date("2026-10-03T10:00:00.000Z"),
            },
            {
                [PARTICIPANT_FIELDS.USER_ID]: member._id,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
                [PARTICIPANT_FIELDS.JOINED_AT]: MEMBER_JOINED_AT,
            },
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: `Group ${suffix}`,
            [GROUP_FIELDS.OWNER_ID]: owner._id,
        },
    })
    return { ownerId: owner._id, memberId: member._id, conversationId: conversation._id }
}

/** Insert historical message data with a controlled creation instant. */
async function insertMessage(
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    content: string,
    createdAt: Date,
    clientMessageId: string,
): Promise<void> {
    await Message.collection.insertOne({
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_MODEL_FIELDS.CONTENT]: content,
        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: clientMessageId,
        [MESSAGE_MODEL_FIELDS.CREATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.UPDATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.DEL_FLAG]: false,
    })
}

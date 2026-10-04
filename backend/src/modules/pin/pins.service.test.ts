import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    PIN_LIMITS,
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
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import { MongoosePinRepository } from "./pin.repository"
import { PinService } from "./pin.service"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const MEMBER_JOINED_AT = new Date("2026-10-04T11:00:00.000Z")
const NEW_MEMBER_JOINED_AT = new Date("2026-10-04T12:00:00.000Z")
const MESSAGE_CREATED_AT = new Date("2026-10-04T13:00:00.000Z")
const BEFORE_NEW_MEMBER_JOINED_AT = new Date("2026-10-04T11:30:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "pins-service-test" })
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

describe("PinService", () => {
    it("should_reject_a_fourth_pin", async () => {
        const group = await createGroup("fourth-pin")
        const messages = await createMessages(group.conversationId, group.ownerId, PIN_LIMITS.MAX_PINNED_MESSAGES + 1)
        const service = createPinService()

        await service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 0), actorId: group.ownerId })
        await service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 1), actorId: group.ownerId })
        await service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 2), actorId: group.ownerId })

        await expect(service.pin({
            conversationId: group.conversationId,
            messageId: messageAt(messages, 3),
            actorId: group.ownerId,
        })).rejects.toMatchObject({ code: ERROR_CODES.PIN_LIMIT })
    })

    it("should_reject_a_regular_member_pin", async () => {
        const group = await createGroup("member-pin")
        const messageId = await createMessage(group.conversationId, group.ownerId, MESSAGE_CREATED_AT)

        await expect(createPinService().pin({
            conversationId: group.conversationId,
            messageId,
            actorId: group.memberId,
        })).rejects.toMatchObject({ code: ERROR_CODES.INSUFFICIENT_ROLE })
    })

    it("should_hide_a_prejoin_pin_from_a_new_member", async () => {
        const group = await createGroup("prejoin-pin")
        const oldMessageId = await createMessage(group.conversationId, group.ownerId, BEFORE_NEW_MEMBER_JOINED_AT)
        const service = createPinService()

        await service.pin({ conversationId: group.conversationId, messageId: oldMessageId, actorId: group.ownerId })
        const newMemberPins = await service.list(group.conversationId, group.newMemberId)

        expect(newMemberPins).toHaveLength(0)
    })

    it("should_reject_a_pin_in_a_direct_conversation", async () => {
        const group = await createGroup("direct-pin")
        const directConversation = await Conversation.create({
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
            [CONVERSATION_FIELDS.PARTICIPANTS]: [
                { [PARTICIPANT_FIELDS.USER_ID]: group.ownerId, [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT },
                { [PARTICIPANT_FIELDS.USER_ID]: group.memberId, [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT },
            ],
        })
        const directMessageId = await createMessage(directConversation._id, group.ownerId, MESSAGE_CREATED_AT)

        await expect(createPinService().pin({
            conversationId: directConversation._id,
            messageId: directMessageId,
            actorId: group.ownerId,
        })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    })

    it("should_not_pin_a_hidden_or_other_conversation_message", async () => {
        const group = await createGroup("hidden-pin")
        const otherGroup = await createGroup("other-pin")
        const hiddenMessageId = await createMessage(group.conversationId, group.ownerId, MESSAGE_CREATED_AT, [group.ownerId])
        const otherMessageId = await createMessage(otherGroup.conversationId, group.ownerId, MESSAGE_CREATED_AT)
        const service = createPinService()

        await expect(service.pin({
            conversationId: group.conversationId,
            messageId: hiddenMessageId,
            actorId: group.ownerId,
        })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
        await expect(service.pin({
            conversationId: group.conversationId,
            messageId: otherMessageId,
            actorId: group.ownerId,
        })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    })

    it("should_hide_an_existing_pin_from_a_viewer_who_hid_its_message", async () => {
        const group = await createGroup("viewer-hidden-pin")
        const messageId = await createMessage(group.conversationId, group.ownerId, MESSAGE_CREATED_AT)
        const service = createPinService()
        await service.pin({ conversationId: group.conversationId, messageId, actorId: group.ownerId })
        await Message.updateOne(
            { [MESSAGE_MODEL_FIELDS.ID]: messageId },
            { $addToSet: { [MESSAGE_MODEL_FIELDS.HIDDEN_BY]: group.newMemberId } },
        )

        const visiblePins = await service.list(group.conversationId, group.newMemberId)

        expect(visiblePins).toHaveLength(0)
    })

    it("should_return_newest_pin_first_and_make_pin_and_unpin_idempotent", async () => {
        const group = await createGroup("pin-order")
        const messages = await createMessages(group.conversationId, group.ownerId, 2)
        const service = createPinService()

        await service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 0), actorId: group.ownerId })
        await service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 1), actorId: group.adminId })
        const repeatedPin = await service.pin({
            conversationId: group.conversationId,
            messageId: messageAt(messages, 1),
            actorId: group.adminId,
        })

        expect(repeatedPin.map(({ id }) => id)).toEqual([messageAt(messages, 1).toString(), messageAt(messages, 0).toString()])
        await service.unpin({ conversationId: group.conversationId, messageId: messageAt(messages, 1), actorId: group.ownerId })
        const repeatedUnpin = await service.unpin({
            conversationId: group.conversationId,
            messageId: messageAt(messages, 1),
            actorId: group.ownerId,
        })
        expect(repeatedUnpin.map(({ id }) => id)).toEqual([messageAt(messages, 0).toString()])
    })

    it("should_keep_the_pin_limit_when_two_admins_pin_at_the_same_time", async () => {
        const group = await createGroup("concurrent-pin")
        const messages = await createMessages(group.conversationId, group.ownerId, PIN_LIMITS.MAX_PINNED_MESSAGES + 2)
        const service = createPinService()
        await service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 0), actorId: group.ownerId })
        await service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 1), actorId: group.adminId })

        const concurrentResults = await Promise.allSettled([
            service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 2), actorId: group.ownerId }),
            service.pin({ conversationId: group.conversationId, messageId: messageAt(messages, 3), actorId: group.adminId }),
        ])
        const successfulPins = concurrentResults.filter((result) => result.status === "fulfilled")
        const rejectedPins = concurrentResults.filter((result) => result.status === "rejected")

        expect(successfulPins).toHaveLength(1)
        expect(rejectedPins).toHaveLength(1)
        expect(rejectedPins[0]).toMatchObject({ reason: { code: ERROR_CODES.PIN_LIMIT } })
        expect(await service.list(group.conversationId, group.ownerId)).toHaveLength(PIN_LIMITS.MAX_PINNED_MESSAGES)
    })
})

function createPinService(): PinService {
    return new PinService({ repository: new MongoosePinRepository(), transactionRunner: { run: withTransaction } })
}

async function createAccount(suffix: string): Promise<mongoose.Types.ObjectId> {
    const user = await User.create({
        username: `pin_${suffix}`,
        email: `pin_${suffix}@example.com`,
        displayName: `Pin ${suffix}`,
        hashedPassword: "pin-test-hash",
    })
    return user._id
}

async function createGroup(suffix: string): Promise<{
    readonly ownerId: mongoose.Types.ObjectId
    readonly adminId: mongoose.Types.ObjectId
    readonly memberId: mongoose.Types.ObjectId
    readonly newMemberId: mongoose.Types.ObjectId
    readonly conversationId: mongoose.Types.ObjectId
}> {
    const [ownerId, adminId, memberId, newMemberId] = await Promise.all([
        createAccount(`${suffix}-owner`),
        createAccount(`${suffix}-admin`),
        createAccount(`${suffix}-member`),
        createAccount(`${suffix}-new-member`),
    ])
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            { [PARTICIPANT_FIELDS.USER_ID]: ownerId, [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER, [PARTICIPANT_FIELDS.JOINED_AT]: MEMBER_JOINED_AT },
            { [PARTICIPANT_FIELDS.USER_ID]: adminId, [PARTICIPANT_FIELDS.ROLE]: ROLE.ADMIN, [PARTICIPANT_FIELDS.JOINED_AT]: MEMBER_JOINED_AT },
            { [PARTICIPANT_FIELDS.USER_ID]: memberId, [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER, [PARTICIPANT_FIELDS.JOINED_AT]: MEMBER_JOINED_AT },
            { [PARTICIPANT_FIELDS.USER_ID]: newMemberId, [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER, [PARTICIPANT_FIELDS.JOINED_AT]: NEW_MEMBER_JOINED_AT },
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: `Group ${suffix}`,
            [GROUP_FIELDS.OWNER_ID]: ownerId,
        },
    })
    return { ownerId, adminId, memberId, newMemberId, conversationId: conversation._id }
}

async function createMessage(
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    createdAt: Date,
    hiddenBy: readonly mongoose.Types.ObjectId[] = [],
): Promise<mongoose.Types.ObjectId> {
    const message = await Message.create({
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: `pin-message-${new mongoose.Types.ObjectId().toString()}`,
        [MESSAGE_MODEL_FIELDS.CONTENT]: "Message to pin",
        [MESSAGE_MODEL_FIELDS.CREATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.UPDATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.HIDDEN_BY]: [...hiddenBy],
    })
    return message._id
}

async function createMessages(
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    count: number,
): Promise<readonly mongoose.Types.ObjectId[]> {
    return Promise.all(Array.from({ length: count }, () => createMessage(conversationId, senderId, MESSAGE_CREATED_AT)))
}

function messageAt(messages: readonly mongoose.Types.ObjectId[], index: number): mongoose.Types.ObjectId {
    const messageId = messages[index]
    if (!messageId) throw new Error("Pin service test fixture is missing a message")
    return messageId
}

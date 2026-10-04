import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    GROUP_FIELDS,
    READ_FIELDS,
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
import { MongooseMessageRepository } from "../message/message.repository"
import { MessageService } from "../message/message.service"
import { MongooseReplyMentionRepository } from "../message/replyMention.repository"
import { ReplyMentionService } from "../message/replyMention.service"
import { MongooseReadStateRepository } from "./read.repository"
import { ReadStateService } from "./read.service"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const READ_CLOCK = new Date("2026-10-04T12:00:00.000Z")
const MEMBER_JOINED_AT = new Date("2026-10-04T11:00:00.000Z")
const PRE_JOIN_TIME = new Date("2026-10-04T10:00:00.000Z")
const VISIBLE_TIME = new Date("2026-10-04T11:30:00.000Z")
const FUTURE_TIME = new Date("2026-10-04T12:01:00.000Z")
const OTHER_MEMBER_UNREAD_COUNT = 5

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "read-state-service-test" })
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

describe("ReadStateService", () => {
    it("should_not_mark_pre_join_or_future_messages_read", async () => {
        const { ownerId, memberId, conversationId } = await createGroup("read-boundary")
        const preJoinMessageId = await insertMessage(conversationId, ownerId, "old", PRE_JOIN_TIME)
        const futureMessageId = await insertMessage(conversationId, ownerId, "future", FUTURE_TIME)
        const service = createReadStateService()

        await expect(service.markRead({
            conversationId,
            userId: memberId,
            lastVisibleMessageId: preJoinMessageId,
        })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
        await expect(service.markRead({
            conversationId,
            userId: memberId,
            lastVisibleMessageId: futureMessageId,
        })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    })

    it("should_set_the_reader_unread_count_to_zero_at_the_latest_visible_message", async () => {
        const { ownerId, memberId, conversationId } = await createGroup("read-latest")
        await insertMessage(
            conversationId,
            ownerId,
            "first visible",
            new Date("2026-10-04T11:10:00.000Z"),
        )
        const latestMessageId = await insertMessage(conversationId, ownerId, "latest visible", VISIBLE_TIME)
        const service = createReadStateService()

        const state = await service.markRead({
            conversationId,
            userId: memberId,
            lastVisibleMessageId: latestMessageId,
        })

        expect(state[READ_FIELDS.LAST_READ_MESSAGE_ID]).toBe(latestMessageId.toString())
        expect(state[READ_FIELDS.UNREAD_COUNT]).toBe(0)
        expect(await service.getUnread(memberId, conversationId)).toBe(0)
    })

    it("should_preserve_other_members_unread_counts_when_marking_one_reader", async () => {
        const owner = await createAccount("reader-owner")
        const member = await createAccount("reader-one")
        const otherMember = await createAccount("reader-two")
        const { conversationId } = await createGroup("read-isolation", owner._id, [member._id, otherMember._id])
        const latestMessageId = await insertMessage(conversationId, owner._id, "visible", VISIBLE_TIME)
        await Conversation.updateOne(
            { [CONVERSATION_FIELDS.ID]: conversationId },
            {
                $set: {
                    [`${CONVERSATION_FIELDS.UNREAD_COUNT}.${member._id.toString()}`]: 3,
                    [`${CONVERSATION_FIELDS.UNREAD_COUNT}.${otherMember._id.toString()}`]: OTHER_MEMBER_UNREAD_COUNT,
                },
            },
        )
        const service = createReadStateService()

        await service.markRead({
            conversationId,
            userId: member._id,
            lastVisibleMessageId: latestMessageId,
        })
        const conversation = await Conversation.findById(conversationId)

        expect(conversation?.[CONVERSATION_FIELDS.UNREAD_COUNT].get(member._id.toString())).toBe(0)
        expect(conversation?.[CONVERSATION_FIELDS.UNREAD_COUNT].get(otherMember._id.toString()))
            .toBe(OTHER_MEMBER_UNREAD_COUNT)
    })

    it("should_keep_the_newer_read_cursor_when_tabs_mark_same_time_messages_out_of_order", async () => {
        const { ownerId, memberId, conversationId } = await createGroup("read-tabs")
        const firstId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439101")
        const secondId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439102")
        await insertMessage(conversationId, ownerId, "first", VISIBLE_TIME, firstId)
        await insertMessage(conversationId, ownerId, "second", VISIBLE_TIME, secondId)
        const service = createReadStateService()

        await service.markRead({ conversationId, userId: memberId, lastVisibleMessageId: secondId })
        const state = await service.markRead({ conversationId, userId: memberId, lastVisibleMessageId: firstId })

        expect(state[READ_FIELDS.LAST_READ_MESSAGE_ID]).toBe(secondId.toString())
    })

    it("should_count_only_other_members_messages_visible_since_join_and_after_read", async () => {
        const { ownerId, memberId, conversationId } = await createGroup("read-count")
        await insertMessage(conversationId, ownerId, "pre-join", PRE_JOIN_TIME)
        await insertMessage(conversationId, memberId, "self message", VISIBLE_TIME)
        await insertMessage(conversationId, ownerId, "unread", new Date("2026-10-04T11:40:00.000Z"))
        const service = createReadStateService()

        expect(await service.getUnread(memberId, conversationId)).toBe(1)
    })

    it("should_not_clear_existing_unread_messages_when_the_reader_sends_a_message", async () => {
        const { memberId, conversationId } = await createGroup("own-message")
        await Conversation.updateOne(
            { [CONVERSATION_FIELDS.ID]: conversationId },
            { $set: { [`${CONVERSATION_FIELDS.UNREAD_COUNT}.${memberId.toString()}`]: OTHER_MEMBER_UNREAD_COUNT } },
        )
        const messageService = new MessageService({
            repository: new MongooseMessageRepository(),
            transactionRunner: { run: withTransaction },
            clock: { now: () => READ_CLOCK },
            replyMentionValidator: new ReplyMentionService({ repository: new MongooseReplyMentionRepository() }),
        })

        await messageService.send({
            conversationId,
            senderId: memberId,
            clientMessageId: "read-state-own-message",
            content: "Sending does not mark the history read",
        })
        const conversation = await Conversation.findById(conversationId)

        expect(conversation?.[CONVERSATION_FIELDS.UNREAD_COUNT].get(memberId.toString()))
            .toBe(OTHER_MEMBER_UNREAD_COUNT)
    })
})

/** Construct the read-state use case with real transactional persistence. */
function createReadStateService(): ReadStateService {
    return new ReadStateService({
        repository: new MongooseReadStateRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => READ_CLOCK },
    })
}

/** Persist one user for read-state membership tests. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return User.create({
        username: `read_${suffix}`,
        email: `read_${suffix}@example.com`,
        displayName: `Read ${suffix}`,
        hashedPassword: "read-state-test-hash",
    })
}

/** Persist a group and record one joinedAt boundary for all current test members. */
async function createGroup(
    suffix: string,
    ownerId?: mongoose.Types.ObjectId,
    memberIds: readonly mongoose.Types.ObjectId[] = [],
): Promise<{
    readonly ownerId: mongoose.Types.ObjectId
    readonly memberId: mongoose.Types.ObjectId
    readonly conversationId: mongoose.Types.ObjectId
}> {
    const owner = ownerId ? { _id: ownerId } : await createAccount(`${suffix}-owner`)
    const members = memberIds.length ? memberIds : [(await createAccount(`${suffix}-member`))._id]
    const conversation = await Conversation.create({
        [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
        [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
        [CONVERSATION_FIELDS.PARTICIPANTS]: [
            {
                [PARTICIPANT_FIELDS.USER_ID]: owner._id,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.OWNER,
                [PARTICIPANT_FIELDS.JOINED_AT]: MEMBER_JOINED_AT,
            },
            ...members.map((userId) => ({
                [PARTICIPANT_FIELDS.USER_ID]: userId,
                [PARTICIPANT_FIELDS.ROLE]: ROLE.MEMBER,
                [PARTICIPANT_FIELDS.JOINED_AT]: MEMBER_JOINED_AT,
            })),
        ],
        [CONVERSATION_FIELDS.GROUP]: {
            [GROUP_FIELDS.NAME]: `Group ${suffix}`,
            [GROUP_FIELDS.OWNER_ID]: owner._id,
        },
    })
    const memberId = members[0]
    if (!memberId) throw new Error("Read-state test group has no member")
    return { ownerId: owner._id, memberId, conversationId: conversation._id }
}

/** Insert one timestamp-controlled content message into MongoDB. */
async function insertMessage(
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    content: string,
    createdAt: Date,
    id = new mongoose.Types.ObjectId(),
): Promise<mongoose.Types.ObjectId> {
    await Message.collection.insertOne({
        _id: id,
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: `read-${id.toString()}`,
        [MESSAGE_MODEL_FIELDS.CONTENT]: content,
        [MESSAGE_MODEL_FIELDS.CREATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.UPDATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.DEL_FLAG]: false,
    })
    return id
}

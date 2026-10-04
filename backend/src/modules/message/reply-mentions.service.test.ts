import { CONVERSATION_STATUS, CONVERSATION_TYPE, ERROR_CODES, GROUP_FIELDS, ROLE } from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import User from "../../models/User"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MESSAGE_MODEL_FIELDS } from "./message.constants"
import { MongooseReplyMentionRepository } from "./replyMention.repository"
import { ReplyMentionService } from "./replyMention.service"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
const MEMBER_JOINED_AT = new Date("2026-10-04T11:00:00.000Z")
const BEFORE_MEMBER_JOINED_AT = new Date("2026-10-04T10:00:00.000Z")
const AFTER_MEMBER_JOINED_AT = new Date("2026-10-04T12:00:00.000Z")

let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "reply-mentions-service-test" })
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

describe("ReplyMentionService", () => {
    it("should_reject_reply_from_other_conversation", async () => {
        const { memberId, conversationId } = await createGroup("other-reply")
        const otherConversation = await createGroup("other-reply-target")
        const target = await insertMessage(
            otherConversation.conversationId,
            otherConversation.ownerId,
            AFTER_MEMBER_JOINED_AT,
        )
        const service = createReplyMentionService()

        await expect(service.validate({
            conversationId,
            senderId: memberId,
            replyToId: target._id,
            mentionIds: [],
        })).rejects.toMatchObject({ code: ERROR_CODES.INVALID_REPLY })
    })

    it("should_reject_pre_join_reply", async () => {
        const { memberId, conversationId, ownerId } = await createGroup("pre-join-reply")
        const target = await insertMessage(conversationId, ownerId, BEFORE_MEMBER_JOINED_AT)
        const service = createReplyMentionService()

        await expect(service.validate({
            conversationId,
            senderId: memberId,
            replyToId: target._id,
            mentionIds: [],
        })).rejects.toMatchObject({ code: ERROR_CODES.INVALID_REPLY })
    })

    it("should_reject_mention_of_nonmember", async () => {
        const { memberId, conversationId } = await createGroup("nonmember-mention")
        const outsider = await createAccount("nonmember-mention-outsider")
        const service = createReplyMentionService()

        await expect(service.validate({
            conversationId,
            senderId: memberId,
            replyToId: null,
            mentionIds: [outsider._id],
        })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    })

    it("should_return_only_unique_mentions_for_current_members", async () => {
        const { ownerId, memberId, conversationId } = await createGroup("unique-mentions")
        const service = createReplyMentionService()

        const validated = await service.validate({
            conversationId,
            senderId: memberId,
            replyToId: null,
            mentionIds: [ownerId, memberId, ownerId],
        })

        expect(validated.mentions).toEqual([ownerId, memberId])
    })
})

/** Create the reply and mention validator with real MongoDB reads. */
function createReplyMentionService(): ReplyMentionService {
    return new ReplyMentionService({ repository: new MongooseReplyMentionRepository() })
}

/** Create a user record for one isolated service test. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return User.create({
        username: `reply_mention_${suffix}`,
        email: `reply_mention_${suffix}@example.com`,
        displayName: `Reply Mention ${suffix}`,
        hashedPassword: "reply-mention-test-hash",
    })
}

/** Persist an active group with one owner and one member who joined at the test boundary. */
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
                [PARTICIPANT_FIELDS.JOINED_AT]: BEFORE_MEMBER_JOINED_AT,
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

/** Insert a target message with a controlled conversation and creation timestamp. */
async function insertMessage(
    conversationId: mongoose.Types.ObjectId,
    senderId: mongoose.Types.ObjectId,
    createdAt: Date,
): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return Message.create({
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: senderId,
        [MESSAGE_MODEL_FIELDS.CONTENT]: "Reply target content stays private",
        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: new mongoose.Types.ObjectId().toString(),
        [MESSAGE_MODEL_FIELDS.CREATED_AT]: createdAt,
        [MESSAGE_MODEL_FIELDS.UPDATED_AT]: createdAt,
    })
}

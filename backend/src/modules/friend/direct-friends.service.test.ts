import {
    CONVERSATION_TYPE,
    ERROR_CODES,
} from "@linko/contracts"
import mongoose from "mongoose"
import { MongoMemoryReplSet } from "mongodb-memory-server"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"

import Conversation from "../../models/Conversation"
import FriendRequest from "../../models/FriendRequest"
import Friendship, { FRIENDSHIP_FIELDS } from "../../models/Friendship"
import Message from "../../models/Message"
import User from "../../models/User"
import { withTransaction } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS } from "../conversation/conversation.constants"
import { MongooseMessageRepository } from "../message/message.repository"
import { MongooseReplyMentionRepository } from "../message/replyMention.repository"
import { ReplyMentionService } from "../message/replyMention.service"
import { MessageService } from "../message/message.service"
import { MongooseFriendRepository } from "./friend.repository"
import { FriendService } from "./friend.service"
import { FRIEND_REQUEST_MODEL_FIELDS } from "./friend.constants"

const TEST_WIRED_TIGER_CACHE_SIZE_GB = "0.25"
let replicaSet: MongoMemoryReplSet

beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
            args: [`--wiredTigerCacheSizeGB=${TEST_WIRED_TIGER_CACHE_SIZE_GB}`],
        },
    })
    await mongoose.connect(replicaSet.getUri(), { dbName: "direct-friends-service-test" })
    await Promise.all([Conversation.init(), FriendRequest.init(), Friendship.init(), Message.init(), User.init()])
})

beforeEach(async () => {
    await Promise.all([
        Conversation.collection.deleteMany({}),
        FriendRequest.collection.deleteMany({}),
        Friendship.collection.deleteMany({}),
        Message.collection.deleteMany({}),
        User.collection.deleteMany({}),
    ])
})

afterAll(async () => {
    await mongoose.disconnect()
    await replicaSet?.stop()
})

describe("FriendService direct conversations", () => {
    it("should_keep_one_pending_request_when_both_users_request_each_other_under_race", async () => {
        const [firstUser, secondUser] = await createUserPair()
        const service = createFriendService()

        const outcomes = await Promise.allSettled([
            service.sendRequest({ actorId: firstUser._id, recipientId: secondUser._id }),
            service.sendRequest({ actorId: secondUser._id, recipientId: firstUser._id }),
        ])

        expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1)
        expect(outcomes.find((outcome) => outcome.status === "rejected")).toMatchObject({
            reason: { code: ERROR_CODES.FRIEND_REQUEST_PENDING },
        })
        expect(await FriendRequest.countDocuments({ [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: false })).toBe(1)
    })

    it("should_allow_only_one_of_concurrent_accept_and_decline", async () => {
        const [firstUser, secondUser] = await createUserPair()
        const service = createFriendService()
        const friendRequest = await service.sendRequest({ actorId: firstUser._id, recipientId: secondUser._id })
        const requestId = new mongoose.Types.ObjectId(friendRequest.id)

        const outcomes = await Promise.allSettled([
            service.accept({ actorId: secondUser._id, requestId }),
            service.decline({ actorId: secondUser._id, requestId }),
        ])

        expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1)
        expect(await FriendRequest.countDocuments({ [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: false })).toBe(0)
        expect(await Friendship.countDocuments({ [FRIENDSHIP_FIELDS.DEL_FLAG]: false })).toBeLessThanOrEqual(1)
    })

    it("should_create_only_one_direct_conversation_under_race", async () => {
        const { firstUser, secondUser } = await createFriends()
        const service = createFriendService()

        const conversations = await Promise.all([
            service.getOrCreateDirectConversation({ actorId: firstUser._id, friendId: secondUser._id }),
            service.getOrCreateDirectConversation({ actorId: secondUser._id, friendId: firstUser._id }),
        ])

        expect(conversations[0]?.id).toBe(conversations[1]?.id)
        expect(await Conversation.countDocuments({ [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT })).toBe(1)
    })

    it("should_reject_send_after_unfriend_for_conversationId", async () => {
        const { firstUser, secondUser } = await createFriends()
        const friendService = createFriendService()
        const directConversation = await friendService.getOrCreateDirectConversation({
            actorId: firstUser._id,
            friendId: secondUser._id,
        })

        await friendService.unfriend({ actorId: firstUser._id, friendId: secondUser._id })

        await expect(createMessageService().send({
            conversationId: new mongoose.Types.ObjectId(directConversation.id),
            senderId: firstUser._id,
            clientMessageId: "former-friend-message",
            content: "This send must be denied",
        })).rejects.toMatchObject({ code: ERROR_CODES.FRIENDSHIP_REQUIRED })
    })
})

/** Construct the friend domain service with real MongoDB transaction boundaries. */
function createFriendService(): FriendService {
    return new FriendService({
        repository: new MongooseFriendRepository(),
        transactionRunner: { run: withTransaction },
    })
}

/** Construct the message service used to verify the existing conversationId friendship guard. */
function createMessageService(): MessageService {
    return new MessageService({
        repository: new MongooseMessageRepository(),
        transactionRunner: { run: withTransaction },
        clock: { now: () => new Date("2026-10-04T12:00:00.000Z") },
        replyMentionValidator: new ReplyMentionService({ repository: new MongooseReplyMentionRepository() }),
        attachmentService: { store: async () => [], cleanup: async () => undefined },
    })
}

/** Persist two users and their canonical active friendship for a domain test. */
async function createFriends(): Promise<{
    readonly firstUser: { readonly _id: mongoose.Types.ObjectId }
    readonly secondUser: { readonly _id: mongoose.Types.ObjectId }
}> {
    const [firstUser, secondUser] = await createUserPair()
    const [userA, userB] = [firstUser._id, secondUser._id].sort((left, right) =>
        left.toString().localeCompare(right.toString()),
    )
    await Friendship.create({
        [FRIENDSHIP_FIELDS.USER_A]: userA,
        [FRIENDSHIP_FIELDS.USER_B]: userB,
    })
    return { firstUser, secondUser }
}

/** Persist a pair of user accounts without a friendship for request race coverage. */
async function createUserPair(): Promise<readonly [
    { readonly _id: mongoose.Types.ObjectId },
    { readonly _id: mongoose.Types.ObjectId },
]> {
    return Promise.all([createAccount("first"), createAccount("second")])
}

/** Persist an account with the minimum fields required by the User model. */
async function createAccount(suffix: string): Promise<{ readonly _id: mongoose.Types.ObjectId }> {
    return User.create({
        username: `direct_friend_${suffix}`,
        email: `direct_friend_${suffix}@example.com`,
        displayName: `Direct friend ${suffix}`,
        hashedPassword: "direct-friends-test-hash",
    })
}

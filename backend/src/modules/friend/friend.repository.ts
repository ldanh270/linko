import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    ROLE,
    USER_SEARCH_MODE,
} from "@linko/contracts"
import type { HydratedDocument } from "mongoose"

import Conversation, { type ConversationType } from "../../models/Conversation"
import FriendRequest from "../../models/FriendRequest"
import Friendship from "../../models/Friendship"
import User from "../../models/User"
import { ConflictException } from "../../shared/errors/ConflictException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import {
    DIRECT_CONVERSATION_FIELDS,
    FRIEND_ERROR_MESSAGES,
    FRIEND_INDEX_NAMES,
    FRIEND_REQUEST_MODEL_FIELDS,
    FRIEND_SEARCH_PATTERNS,
    FRIEND_SEARCH_LIMITS,
    FRIENDSHIP_FIELDS,
    FRIEND_USER_FIELDS,
} from "./friend.constants"
import type {
    DeclineFriendRequestResult,
    DirectConversationRecord,
    FriendRequestActionInput,
    FriendRequestActionResult,
    FriendRequestDirection,
    FriendRequestRecord,
    FriendRepository,
    ObjectId,
    OpenDirectConversationInput,
    PublicUserRecord,
    SearchPeopleInput,
    SendFriendRequestInput,
    UnfriendInput,
} from "./friend.types"

type DirectConversationDocument = HydratedDocument<ConversationType>

/** Isolate active friend data, public profile selection, and canonical direct pair writes.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseFriendRepository implements FriendRepository {
    /** Find the public fields of an active account. */
    async findPublicUser(userId: ObjectId, transaction?: TransactionContext): Promise<PublicUserRecord | null> {
        const query = User.findOne({ [FRIEND_USER_FIELDS.ID]: userId })
            .select(publicUserProjection())
        if (transaction) query.session(transaction.session)
        const user = await query.lean().exec()
        return user ? toPublicUserRecord(user) : null
    }

    /** Search bounded public profiles and omit the signed-in user. */
    async searchPeople(input: SearchPeopleInput): Promise<readonly PublicUserRecord[]> {
        const limit = input.type === USER_SEARCH_MODE.TYPING ? FRIEND_SEARCH_LIMITS.TYPING : FRIEND_SEARCH_LIMITS.FULL
        const safeKeyword = escapeRegularExpression(input.keyword.trim())
        const users = await User.find({
            [FRIEND_USER_FIELDS.ID]: { $ne: input.actorId },
            $or: [
                { [FRIEND_USER_FIELDS.USERNAME]: { $regex: safeKeyword, $options: "i" } },
                { [FRIEND_USER_FIELDS.DISPLAY_NAME]: { $regex: safeKeyword, $options: "i" } },
            ],
        })
            .select(publicUserProjection())
            .sort({ [FRIEND_USER_FIELDS.USERNAME]: 1 })
            .limit(limit)
            .lean()
            .exec()
        return users.map(toPublicUserRecord)
    }

    /** List public profiles for each active canonical friendship. */
    async listFriends(userId: ObjectId): Promise<readonly PublicUserRecord[]> {
        const friendships = await Friendship.find({
            $or: [
                { [FRIENDSHIP_FIELDS.USER_A]: userId },
                { [FRIENDSHIP_FIELDS.USER_B]: userId },
            ],
        }).select(`${FRIENDSHIP_FIELDS.USER_A} ${FRIENDSHIP_FIELDS.USER_B}`).lean().exec()
        const friendIds = friendships.map((friendship) =>
            friendship[FRIENDSHIP_FIELDS.USER_A].equals(userId)
                ? friendship[FRIENDSHIP_FIELDS.USER_B]
                : friendship[FRIENDSHIP_FIELDS.USER_A],
        )
        if (friendIds.length === 0) return []
        const users = await User.find({
            [FRIEND_USER_FIELDS.ID]: { $in: friendIds },
        }).select(publicUserProjection()).lean().exec()
        const profiles = new Map(users.map((user) => [user[FRIEND_USER_FIELDS.ID].toString(), toPublicUserRecord(user)]))
        return friendIds.flatMap((friendId) => {
            const profile = profiles.get(friendId.toString())
            return profile ? [profile] : []
        })
    }

    /** List sent or received requests with only safe fields for both accounts. */
    async listRequests(userId: ObjectId, direction: FriendRequestDirection): Promise<readonly FriendRequestRecord[]> {
        const directionField = direction === "SENT" ? FRIEND_REQUEST_MODEL_FIELDS.FROM : FRIEND_REQUEST_MODEL_FIELDS.TO
        const requests = await FriendRequest.find({
            [directionField]: userId,
        }).sort({ [FRIEND_REQUEST_MODEL_FIELDS.CREATED_AT]: -1 }).lean().exec()
        const accountIds = Array.from(new Map(requests.flatMap((request) => [
            request[FRIEND_REQUEST_MODEL_FIELDS.FROM],
            request[FRIEND_REQUEST_MODEL_FIELDS.TO],
        ]).map((id) => [id.toString(), id])).values())
        const users = accountIds.length
            ? await User.find({
                [FRIEND_USER_FIELDS.ID]: { $in: accountIds },
            }).select(publicUserProjection()).lean().exec()
            : []
        const profiles = new Map(users.map((user) => [user[FRIEND_USER_FIELDS.ID].toString(), toPublicUserRecord(user)]))
        return requests.flatMap((request) => {
            const from = profiles.get(request[FRIEND_REQUEST_MODEL_FIELDS.FROM].toString())
            const to = profiles.get(request[FRIEND_REQUEST_MODEL_FIELDS.TO].toString())
            return from && to ? [toFriendRequestRecord(request, from, to)] : []
        })
    }

    /** Check one active friendship between canonical participant identifiers. */
    async areFriends(userA: ObjectId, userB: ObjectId, transaction?: TransactionContext): Promise<boolean> {
        const [firstUserId, secondUserId] = canonicalPair(userA, userB)
        const query = Friendship.exists({
            [FRIENDSHIP_FIELDS.USER_A]: firstUserId,
            [FRIENDSHIP_FIELDS.USER_B]: secondUserId,
        })
        if (transaction) query.session(transaction.session)
        return (await query.exec()) !== null
    }

    /** Check both request directions so reciprocal requests do not create duplicate pending state. */
    async hasPendingRequest(userA: ObjectId, userB: ObjectId, transaction?: TransactionContext): Promise<boolean> {
        const query = FriendRequest.exists({
            $or: [
                { [FRIEND_REQUEST_MODEL_FIELDS.FROM]: userA, [FRIEND_REQUEST_MODEL_FIELDS.TO]: userB },
                { [FRIEND_REQUEST_MODEL_FIELDS.FROM]: userB, [FRIEND_REQUEST_MODEL_FIELDS.TO]: userA },
            ],
        })
        if (transaction) query.session(transaction.session)
        return (await query.exec()) !== null
    }

    /** Create a request and return the sender and recipient's safe public fields. */
    async createRequest(input: SendFriendRequestInput, transaction: TransactionContext): Promise<FriendRequestRecord> {
        try {
            const [pairUserA, pairUserB] = canonicalPair(input.actorId, input.recipientId)
            const [request] = await FriendRequest.create([{
                [FRIEND_REQUEST_MODEL_FIELDS.FROM]: input.actorId,
                [FRIEND_REQUEST_MODEL_FIELDS.TO]: input.recipientId,
                [FRIEND_REQUEST_MODEL_FIELDS.MESSAGE]: input.message?.trim() || undefined,
                [FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_A]: pairUserA,
                [FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_B]: pairUserB,
            }], { session: transaction.session })
            if (!request) throw new Error(FRIEND_ERROR_MESSAGES.INVALID_RECORD)
            const [from, to] = await Promise.all([
                this.findPublicUser(input.actorId, transaction),
                this.findPublicUser(input.recipientId, transaction),
            ])
            if (!from || !to) throw new Error(FRIEND_ERROR_MESSAGES.INVALID_RECORD)
            return {
                id: request[FRIEND_REQUEST_MODEL_FIELDS.ID],
                from,
                to,
                message: request[FRIEND_REQUEST_MODEL_FIELDS.MESSAGE] ?? null,
                createdAt: request[FRIEND_REQUEST_MODEL_FIELDS.CREATED_AT],
            }
        } catch (error) {
            if (isFriendRequestDuplicate(error)) {
                throw new ConflictException(ERROR_CODES.FRIEND_REQUEST_PENDING, FRIEND_ERROR_MESSAGES.REQUEST_PENDING)
            }
            throw error
        }
    }

    /** Atomically consume an incoming request and add one canonical friendship. */
    async acceptRequest(
        input: FriendRequestActionInput,
        transaction: TransactionContext,
    ): Promise<FriendRequestActionResult> {
        const pending = await this.findActionableRequest(input, transaction)
        if (pending.status !== "found") return pending
        const accepted = await FriendRequest.findOneAndUpdate(
            {
                [FRIEND_REQUEST_MODEL_FIELDS.ID]: input.requestId,
                [FRIEND_REQUEST_MODEL_FIELDS.TO]: input.actorId,
                [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: { $ne: true },
            },
            { $set: { [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: true } },
            { returnDocument: "after", session: transaction.session },
        ).exec()
        if (!accepted) return { status: "missing" }
        const [userA, userB] = canonicalPair(input.actorId, accepted[FRIEND_REQUEST_MODEL_FIELDS.FROM])
        await Friendship.create([{
            [FRIENDSHIP_FIELDS.USER_A]: userA,
            [FRIENDSHIP_FIELDS.USER_B]: userB,
        }], { session: transaction.session })
        const friend = await this.findPublicUser(accepted[FRIEND_REQUEST_MODEL_FIELDS.FROM], transaction)
        if (!friend) throw new Error(FRIEND_ERROR_MESSAGES.INVALID_RECORD)
        return { status: "completed", friend }
    }

    /** Atomically soft-delete an incoming request only for its recipient. */
    async declineRequest(
        input: FriendRequestActionInput,
        transaction: TransactionContext,
    ): Promise<DeclineFriendRequestResult> {
        const pending = await this.findActionableRequest(input, transaction)
        if (pending.status === "missing") return "missing"
        if (pending.status === "forbidden") return "forbidden"
        const declined = await FriendRequest.updateOne(
            {
                [FRIEND_REQUEST_MODEL_FIELDS.ID]: input.requestId,
                [FRIEND_REQUEST_MODEL_FIELDS.TO]: input.actorId,
                [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: { $ne: true },
            },
            { $set: { [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: true } },
            { session: transaction.session },
        ).exec()
        return declined.modifiedCount === 1 ? "declined" : "missing"
    }

    /** Soft-delete one canonical active friendship and release its unique pair index. */
    async unfriend(input: UnfriendInput, transaction: TransactionContext): Promise<boolean> {
        const [userA, userB] = canonicalPair(input.actorId, input.friendId)
        const result = await Friendship.updateOne({
            [FRIENDSHIP_FIELDS.USER_A]: userA,
            [FRIENDSHIP_FIELDS.USER_B]: userB,
            [FRIENDSHIP_FIELDS.DEL_FLAG]: { $ne: true },
        }, {
            $set: { [FRIENDSHIP_FIELDS.DEL_FLAG]: true },
        }, { session: transaction.session }).exec()
        return result.modifiedCount === 1
    }

    /** Find an existing pair or create the uniquely indexed direct conversation. */
    async getOrCreateDirectConversation(
        input: OpenDirectConversationInput,
        transaction: TransactionContext,
    ): Promise<DirectConversationRecord> {
        const [userA, userB] = canonicalPair(input.actorId, input.friendId)
        let conversation = await this.findDirectConversationDocument(userA, userB, transaction)
        if (conversation) {
            if (!conversation[DIRECT_CONVERSATION_FIELDS.USER_A] || !conversation[DIRECT_CONVERSATION_FIELDS.USER_B]) {
                await Conversation.updateOne(
                    {
                        [CONVERSATION_FIELDS.ID]: conversation[CONVERSATION_FIELDS.ID],
                        [CONVERSATION_FIELDS.DEL_FLAG]: { $ne: true },
                    },
                    { $set: {
                        [DIRECT_CONVERSATION_FIELDS.USER_A]: userA,
                        [DIRECT_CONVERSATION_FIELDS.USER_B]: userB,
                    } },
                    { session: transaction.session },
                ).exec()
            }
            return this.toDirectConversationRecord(conversation, transaction)
        }

        const [created] = await Conversation.create([{
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
            [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
            [DIRECT_CONVERSATION_FIELDS.USER_A]: userA,
            [DIRECT_CONVERSATION_FIELDS.USER_B]: userB,
            [CONVERSATION_FIELDS.PARTICIPANTS]: [
                { [PARTICIPANT_FIELDS.USER_ID]: userA, [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT },
                { [PARTICIPANT_FIELDS.USER_ID]: userB, [PARTICIPANT_FIELDS.ROLE]: ROLE.DIRECT },
            ],
        }], { session: transaction.session })
        if (!created) throw new Error(FRIEND_ERROR_MESSAGES.INVALID_RECORD)
        conversation = created
        return this.toDirectConversationRecord(conversation, transaction)
    }

    /** Recover the active pair after another request wins the unique direct conversation index. */
    async findDirectConversation(userA: ObjectId, userB: ObjectId): Promise<DirectConversationRecord | null> {
        const [firstUserId, secondUserId] = canonicalPair(userA, userB)
        const conversation = await this.findDirectConversationDocument(firstUserId, secondUserId)
        return conversation ? this.toDirectConversationRecord(conversation) : null
    }

    private async findActionableRequest(
        input: FriendRequestActionInput,
        transaction: TransactionContext,
    ): Promise<{ readonly status: "found"; readonly fromId: ObjectId } | { readonly status: "missing" | "forbidden" }> {
        const request = await FriendRequest.findOne({
            [FRIEND_REQUEST_MODEL_FIELDS.ID]: input.requestId,
        }).session(transaction.session).exec()
        if (!request) return { status: "missing" }
        if (!request[FRIEND_REQUEST_MODEL_FIELDS.TO].equals(input.actorId)) return { status: "forbidden" }
        return { status: "found", fromId: request[FRIEND_REQUEST_MODEL_FIELDS.FROM] }
    }

    private async findDirectConversationDocument(
        userA: ObjectId,
        userB: ObjectId,
        transaction?: TransactionContext,
    ): Promise<DirectConversationDocument | null> {
        const query = Conversation.findOne({
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
            $or: [
                {
                    [DIRECT_CONVERSATION_FIELDS.USER_A]: userA,
                    [DIRECT_CONVERSATION_FIELDS.USER_B]: userB,
                },
                {
                    [`${CONVERSATION_FIELDS.PARTICIPANTS}.${PARTICIPANT_FIELDS.USER_ID}`]: { $all: [userA, userB] },
                    [CONVERSATION_FIELDS.PARTICIPANTS]: { $size: 2 },
                },
            ],
        })
        if (transaction) query.session(transaction.session)
        return query.exec()
    }

    private async toDirectConversationRecord(
        conversation: DirectConversationDocument,
        transaction?: TransactionContext,
    ): Promise<DirectConversationRecord> {
        const participants = conversation[CONVERSATION_FIELDS.PARTICIPANTS]
            .filter((participant) => participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true)
        const usersQuery = User.find({
            [FRIEND_USER_FIELDS.ID]: { $in: participants.map((participant) => participant[PARTICIPANT_FIELDS.USER_ID]) },
        }).select({
            [FRIEND_USER_FIELDS.DISPLAY_NAME]: 1,
            [`${FRIEND_USER_FIELDS.AVATAR}.${FRIEND_USER_FIELDS.AVATAR_URL}`]: 1,
        })
        if (transaction) usersQuery.session(transaction.session)
        const users = await usersQuery.lean().exec()
        const profiles = new Map(users.map((user) => [user[FRIEND_USER_FIELDS.ID].toString(), {
            displayName: user[FRIEND_USER_FIELDS.DISPLAY_NAME],
            avatarUrl: user[FRIEND_USER_FIELDS.AVATAR]?.[FRIEND_USER_FIELDS.AVATAR_URL] ?? null,
        }]))
        return {
            id: conversation[CONVERSATION_FIELDS.ID],
            status: conversation[CONVERSATION_FIELDS.STATUS] ?? CONVERSATION_STATUS.ACTIVE,
            participants: participants.map((participant) => {
                const userId = participant[PARTICIPANT_FIELDS.USER_ID]
                const profile = profiles.get(userId.toString())
                return {
                    id: userId,
                    displayName: profile?.displayName ?? null,
                    avatarUrl: profile?.avatarUrl ?? null,
                    joinedAt: participant[PARTICIPANT_FIELDS.JOINED_AT] ?? null,
                }
            }),
            createdAt: conversation[CONVERSATION_FIELDS.CREATED_AT],
            updatedAt: conversation[CONVERSATION_FIELDS.UPDATED_AT],
        }
    }
}

function publicUserProjection(): Record<string, 1> {
    return {
        [FRIEND_USER_FIELDS.USERNAME]: 1,
        [FRIEND_USER_FIELDS.DISPLAY_NAME]: 1,
        [`${FRIEND_USER_FIELDS.AVATAR}.${FRIEND_USER_FIELDS.AVATAR_URL}`]: 1,
        [`${FRIEND_USER_FIELDS.BACKGROUND}.${FRIEND_USER_FIELDS.BACKGROUND_URL}`]: 1,
        [FRIEND_USER_FIELDS.BIO]: 1,
    }
}

interface PublicUserDocument {
    readonly [FRIEND_USER_FIELDS.ID]: ObjectId
    readonly [FRIEND_USER_FIELDS.USERNAME]: string
    readonly [FRIEND_USER_FIELDS.DISPLAY_NAME]: string
    readonly [FRIEND_USER_FIELDS.AVATAR]?: {
        readonly [FRIEND_USER_FIELDS.AVATAR_URL]?: string | null
    } | null
    readonly [FRIEND_USER_FIELDS.BACKGROUND]?: {
        readonly [FRIEND_USER_FIELDS.BACKGROUND_URL]?: string | null
    } | null
    readonly [FRIEND_USER_FIELDS.BIO]?: string | null
}

function toPublicUserRecord(user: PublicUserDocument): PublicUserRecord {
    return {
        id: user[FRIEND_USER_FIELDS.ID],
        username: user[FRIEND_USER_FIELDS.USERNAME],
        displayName: user[FRIEND_USER_FIELDS.DISPLAY_NAME],
        avatarUrl: user[FRIEND_USER_FIELDS.AVATAR]?.[FRIEND_USER_FIELDS.AVATAR_URL] ?? null,
        backgroundUrl: user[FRIEND_USER_FIELDS.BACKGROUND]?.[FRIEND_USER_FIELDS.BACKGROUND_URL] ?? null,
        bio: user[FRIEND_USER_FIELDS.BIO] ?? null,
    }
}

function toFriendRequestRecord(
    request: FriendRequestDocument,
    from: PublicUserRecord,
    to: PublicUserRecord,
): FriendRequestRecord {
    return {
        id: request[FRIEND_REQUEST_MODEL_FIELDS.ID],
        from,
        to,
        message: request[FRIEND_REQUEST_MODEL_FIELDS.MESSAGE] ?? null,
        createdAt: request[FRIEND_REQUEST_MODEL_FIELDS.CREATED_AT],
    }
}

function canonicalPair(userA: ObjectId, userB: ObjectId): readonly [ObjectId, ObjectId] {
    return userA.toString().localeCompare(userB.toString()) <= 0 ? [userA, userB] : [userB, userA]
}

function escapeRegularExpression(value: string): string {
    return value.replace(FRIEND_SEARCH_PATTERNS.REGEX_SPECIAL_CHARACTERS, "\\$&")
}

function isFriendRequestDuplicate(error: unknown): boolean {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== 11000) return false
    return "message" in error && typeof error.message === "string"
        && (error.message.includes(FRIEND_INDEX_NAMES.ACTIVE_FRIEND_REQUEST)
            || error.message.includes(FRIEND_INDEX_NAMES.ACTIVE_FRIEND_REQUEST_PAIR))
}

interface FriendRequestDocument {
    readonly [FRIEND_REQUEST_MODEL_FIELDS.ID]: ObjectId
    readonly [FRIEND_REQUEST_MODEL_FIELDS.FROM]: ObjectId
    readonly [FRIEND_REQUEST_MODEL_FIELDS.TO]: ObjectId
    readonly [FRIEND_REQUEST_MODEL_FIELDS.MESSAGE]?: string | null
    readonly [FRIEND_REQUEST_MODEL_FIELDS.CREATED_AT]: Date
}

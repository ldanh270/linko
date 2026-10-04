import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
} from "@linko/contracts"
import type { HydratedDocument, QueryFilter } from "mongoose"

import Conversation, { type ConversationType } from "../../models/Conversation"
import Friendship, { FRIENDSHIP_FIELDS } from "../../models/Friendship"
import Message, { type MessageType } from "../../models/Message"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import {
    CONVERSATION_FIELDS as MESSAGE_CONVERSATION_FIELDS,
    LAST_MESSAGE_FIELDS as MESSAGE_LAST_MESSAGE_FIELDS,
    PARTICIPANT_FIELDS as MESSAGE_PARTICIPANT_FIELDS,
} from "../conversation/conversation.constants"
import {
    MESSAGE_MODEL_FIELDS,
    MESSAGE_INDEX_NAMES,
    MESSAGE_ERROR_MESSAGES,
} from "./message.constants"
import { MessageDuplicateKeyError } from "./MessageDuplicateKeyError"
import type {
    ConversationMessageAccessRecord,
    CreateMessageRecord,
    ListMessageRecordsInput,
    ListMessageRecordsResult,
    MessageCursor,
    MessageRecord,
    MessageRepository,
    ObjectId,
} from "./message.types"

type ConversationDocument = HydratedDocument<ConversationType>
type MessageDocument = HydratedDocument<MessageType>

/** Isolate message persistence, membership reads, and conversation summary writes.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseMessageRepository implements MessageRepository {
    /** Load lifecycle status and current participant history boundary for an actor. */
    async findConversationAccess(
        conversationId: ObjectId,
        userId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<ConversationMessageAccessRecord | null> {
        const query = Conversation.findById(conversationId)
        if (transaction) query.session(transaction.session)
        const conversation = await query.exec()
        if (!conversation) return null

        const participants = conversation[MESSAGE_CONVERSATION_FIELDS.PARTICIPANTS]
        const activeParticipants = participants.filter((participant) =>
            participant[MESSAGE_PARTICIPANT_FIELDS.DEL_FLAG] !== true,
        )
        const currentParticipant = activeParticipants.find((participant) =>
            participant[MESSAGE_PARTICIPANT_FIELDS.USER_ID].equals(userId),
        )

        return {
            conversationId: conversation[MESSAGE_CONVERSATION_FIELDS.ID],
            type: conversation[MESSAGE_CONVERSATION_FIELDS.TYPE],
            status: conversation[MESSAGE_CONVERSATION_FIELDS.STATUS] ?? CONVERSATION_STATUS.ACTIVE,
            participantIds: activeParticipants.map((participant) => participant[MESSAGE_PARTICIPANT_FIELDS.USER_ID]),
            joinedAt: currentParticipant
                ? currentParticipant[MESSAGE_PARTICIPANT_FIELDS.JOINED_AT] ?? conversation[MESSAGE_CONVERSATION_FIELDS.CREATED_AT]
                : null,
        }
    }

    /** Check an active friendship between the canonicalized pair of direct participants. */
    async areFriends(userA: ObjectId, userB: ObjectId, transaction?: TransactionContext): Promise<boolean> {
        const [firstUserId, secondUserId] = [userA, userB].sort((left, right) =>
            left.toString().localeCompare(right.toString()),
        )
        const query = Friendship.exists({
            [FRIENDSHIP_FIELDS.USER_A]: firstUserId,
            [FRIENDSHIP_FIELDS.USER_B]: secondUserId,
        })
        if (transaction) query.session(transaction.session)
        return (await query.exec()) !== null
    }

    /** Read one message by its sender-scoped idempotency key. */
    async findByClientMessageId(
        conversationId: ObjectId,
        senderId: ObjectId,
        clientMessageId: string,
        transaction?: TransactionContext,
    ): Promise<MessageRecord | null> {
        const query = Message.findOne({
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
            [MESSAGE_MODEL_FIELDS.SENDER_ID]: senderId,
            [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: clientMessageId,
        })
        if (transaction) query.session(transaction.session)
        const message = await query.exec()
        return message ? this.toMessageRecord(message) : null
    }

    /** Insert validated message content and references, translating unique-key races. */
    async createMessage(input: CreateMessageRecord, transaction: TransactionContext): Promise<MessageRecord> {
        try {
            const [message] = await Message.create([{
                [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: input.conversationId,
                [MESSAGE_MODEL_FIELDS.SENDER_ID]: input.senderId,
                [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: input.clientMessageId,
                [MESSAGE_MODEL_FIELDS.CONTENT]: input.content,
                [MESSAGE_MODEL_FIELDS.REPLY_TO]: input.replyToId,
                [MESSAGE_MODEL_FIELDS.MENTIONS]: [...input.mentions],
                [MESSAGE_MODEL_FIELDS.CREATED_AT]: input.createdAt,
                [MESSAGE_MODEL_FIELDS.UPDATED_AT]: input.createdAt,
            }], { session: transaction.session })
            if (!message) throw new Error(MESSAGE_ERROR_MESSAGES.INVALID_RECORD)
            return this.toMessageRecord(message)
        } catch (error) {
            if (isMessageIdempotencyCollision(error)) throw new MessageDuplicateKeyError()
            throw error
        }
    }

    /** Update inbox preview and current-member unread counters in the message transaction. */
    async updateConversationAfterMessage(message: MessageRecord, transaction: TransactionContext): Promise<void> {
        const conversation = await Conversation.findById(message.conversationId).session(transaction.session)
        if (!conversation) throw new Error(MESSAGE_ERROR_MESSAGES.CONVERSATION_NOT_FOUND)

        conversation.set(MESSAGE_CONVERSATION_FIELDS.LAST_MESSAGE, {
            [MESSAGE_LAST_MESSAGE_FIELDS.MESSAGE_ID]: message.id,
            [MESSAGE_LAST_MESSAGE_FIELDS.SENDER_ID]: message.senderId,
            [MESSAGE_LAST_MESSAGE_FIELDS.CONTENT]: message.content,
            [MESSAGE_LAST_MESSAGE_FIELDS.CREATED_AT]: message.createdAt,
        })

        const unreadCount = conversation[MESSAGE_CONVERSATION_FIELDS.UNREAD_COUNT]
        for (const participant of conversation[MESSAGE_CONVERSATION_FIELDS.PARTICIPANTS]) {
            if (participant[MESSAGE_PARTICIPANT_FIELDS.DEL_FLAG] === true) continue
            const participantId = participant[MESSAGE_PARTICIPANT_FIELDS.USER_ID]
            const participantKey = participantId.toString()
            const previousCount = unreadCount.get(participantKey) ?? 0
            unreadCount.set(
                participantKey,
                participantId.equals(message.senderId) ? previousCount : previousCount + 1,
            )
        }

        await conversation.save({ session: transaction.session })
    }

    /** Return a chronological page filtered by the current membership's joinedAt boundary. */
    async listMessages(
        input: ListMessageRecordsInput,
        transaction?: TransactionContext,
    ): Promise<ListMessageRecordsResult> {
        const filter: QueryFilter<MessageType> = {
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: input.conversationId,
            [MESSAGE_MODEL_FIELDS.CREATED_AT]: { $gte: input.joinedAt },
        }
        if (input.cursor) filter.$or = createCursorFilter(input.cursor)

        const query = Message.find(filter)
            .sort({ [MESSAGE_MODEL_FIELDS.CREATED_AT]: -1, [MESSAGE_MODEL_FIELDS.ID]: -1 })
            .limit(input.limit + 1)
        if (transaction) query.session(transaction.session)
        const documents = await query.exec()
        const hasMore = documents.length > input.limit
        const pageDocuments = documents.slice(0, input.limit).reverse()
        return { items: pageDocuments.map((document) => this.toMessageRecord(document)), hasMore }
    }

    private toMessageRecord(message: MessageDocument): MessageRecord {
        return {
            id: message[MESSAGE_MODEL_FIELDS.ID],
            conversationId: message[MESSAGE_MODEL_FIELDS.CONVERSATION_ID],
            senderId: message[MESSAGE_MODEL_FIELDS.SENDER_ID],
            clientMessageId: message[MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID] ?? "",
            content: message[MESSAGE_MODEL_FIELDS.CONTENT] ?? null,
            replyToId: message[MESSAGE_MODEL_FIELDS.REPLY_TO] ?? null,
            mentions: message[MESSAGE_MODEL_FIELDS.MENTIONS] ?? [],
            createdAt: message[MESSAGE_MODEL_FIELDS.CREATED_AT],
            updatedAt: message[MESSAGE_MODEL_FIELDS.UPDATED_AT],
        }
    }
}

function createCursorFilter(cursor: MessageCursor): QueryFilter<MessageType>[] {
    return [
        { [MESSAGE_MODEL_FIELDS.CREATED_AT]: { $lt: cursor.createdAt } },
        {
            [MESSAGE_MODEL_FIELDS.CREATED_AT]: cursor.createdAt,
            [MESSAGE_MODEL_FIELDS.ID]: { $lt: cursor.id },
        },
    ]
}

function isMessageIdempotencyCollision(error: unknown): boolean {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== 11000) return false
    if (!("keyPattern" in error) || typeof error.keyPattern !== "object" || error.keyPattern === null) return false
    const fields = Object.keys(error.keyPattern).sort()
    return fields.join(",") === [
        MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID,
        MESSAGE_MODEL_FIELDS.CONVERSATION_ID,
        MESSAGE_MODEL_FIELDS.SENDER_ID,
    ].sort().join(",")
        && ("message" in error && typeof error.message === "string")
        && error.message.includes(MESSAGE_INDEX_NAMES.IDEMPOTENCY)
}

import type { QueryFilter } from "mongoose"

import Conversation from "../../models/Conversation"
import Message, { type MessageType } from "../../models/Message"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import type {
    CountUnreadInput,
    ReadCursor,
    ReadParticipantRecord,
    ReadStateRecord,
    ReadStateRepository,
    UpdateReadStateInput,
    VisibleMessageRecord,
} from "./read.types"

/** Persist each participant's monotonic read cursor and their inbox unread count.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseReadStateRepository implements ReadStateRepository {
    /** Load one currently active conversation participant and their current cursor. */
    async findCurrentMember(
        conversationId: ReadParticipantRecord["conversationId"],
        userId: ReadParticipantRecord["userId"],
        transaction?: TransactionContext,
    ): Promise<ReadParticipantRecord | null> {
        const query = Conversation.findById(conversationId)
        if (transaction) query.session(transaction.session)
        const conversation = await query.exec()
        if (!conversation) return null

        const participant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((entry) =>
            entry[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && entry[PARTICIPANT_FIELDS.USER_ID].equals(userId),
        )
        if (!participant) return null

        return {
            conversationId: conversation[CONVERSATION_FIELDS.ID],
            userId: participant[PARTICIPANT_FIELDS.USER_ID],
            joinedAt: participant[PARTICIPANT_FIELDS.JOINED_AT] ?? conversation[CONVERSATION_FIELDS.CREATED_AT],
            lastReadAt: participant[PARTICIPANT_FIELDS.LAST_READ_AT] ?? null,
            lastReadMessageId: participant[PARTICIPANT_FIELDS.LAST_READ_MESSAGE_ID] ?? null,
        }
    }

    /** Read a same-conversation message only inside the member's visible time window. */
    async findVisibleMessage(
        conversationId: ReadParticipantRecord["conversationId"],
        messageId: VisibleMessageRecord["id"],
        joinedAt: Date,
        at: Date,
        transaction: TransactionContext,
    ): Promise<VisibleMessageRecord | null> {
        const message = await Message.findOne({
            [MESSAGE_MODEL_FIELDS.ID]: messageId,
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
            [MESSAGE_MODEL_FIELDS.CREATED_AT]: { $gte: joinedAt, $lte: at },
        }).session(transaction.session)
        return message
            ? { id: message[MESSAGE_MODEL_FIELDS.ID], createdAt: message[MESSAGE_MODEL_FIELDS.CREATED_AT] }
            : null
    }

    /** Count visible messages from other participants after the given cursor. */
    async countUnread(input: CountUnreadInput, transaction?: TransactionContext): Promise<number> {
        const filter: QueryFilter<MessageType> = {
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: input.conversationId,
            [MESSAGE_MODEL_FIELDS.SENDER_ID]: { $ne: input.userId },
            [MESSAGE_MODEL_FIELDS.CREATED_AT]: { $gte: input.joinedAt, $lte: input.at },
        }
        if (input.cursor) filter.$or = createUnreadCursorFilter(input.cursor)
        const query = Message.countDocuments(filter)
        if (transaction) query.session(transaction.session)
        return query.exec()
    }

    /** Persist the selected read cursor and unread count on the same conversation document. */
    async updateReadState(input: UpdateReadStateInput, transaction: TransactionContext): Promise<ReadStateRecord | null> {
        const conversation = await Conversation.findById(input.conversationId).session(transaction.session)
        if (!conversation) return null

        const participant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((entry) =>
            entry[PARTICIPANT_FIELDS.DEL_FLAG] !== true
                && entry[PARTICIPANT_FIELDS.USER_ID].equals(input.userId),
        )
        if (!participant) return null

        const lastReadAt = participant[PARTICIPANT_FIELDS.LAST_READ_AT]
        const lastReadMessageId = participant[PARTICIPANT_FIELDS.LAST_READ_MESSAGE_ID]
        const currentCursor = lastReadAt && lastReadMessageId
            ? {
                createdAt: lastReadAt,
                messageId: lastReadMessageId,
            }
            : null
        const requestedCursor: ReadCursor = {
            createdAt: input.lastReadAt,
            messageId: input.lastReadMessageId,
        }
        const cursor = selectNewestCursor(currentCursor, requestedCursor)
        participant[PARTICIPANT_FIELDS.LAST_READ_AT] = cursor.createdAt
        participant[PARTICIPANT_FIELDS.LAST_READ_MESSAGE_ID] = cursor.messageId
        conversation[CONVERSATION_FIELDS.UNREAD_COUNT].set(input.userId.toString(), input.unreadCount)
        await conversation.save({ session: transaction.session })

        return {
            conversationId: input.conversationId,
            lastReadAt: cursor.createdAt,
            lastReadMessageId: cursor.messageId,
            unreadCount: input.unreadCount,
        }
    }
}

function createUnreadCursorFilter(cursor: ReadCursor): QueryFilter<MessageType>[] {
    return [
        { [MESSAGE_MODEL_FIELDS.CREATED_AT]: { $gt: cursor.createdAt } },
        {
            [MESSAGE_MODEL_FIELDS.CREATED_AT]: cursor.createdAt,
            [MESSAGE_MODEL_FIELDS.ID]: { $gt: cursor.messageId },
        },
    ]
}

function selectNewestCursor(current: ReadCursor | null, requested: ReadCursor): ReadCursor {
    if (!current || compareCursor(current, requested) < 0) return requested
    return current
}

function compareCursor(first: ReadCursor, second: ReadCursor): number {
    const dateDifference = first.createdAt.getTime() - second.createdAt.getTime()
    if (dateDifference !== 0) return dateDifference
    return first.messageId.toString().localeCompare(second.messageId.toString())
}

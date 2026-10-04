import type { HydratedDocument } from "mongoose"

import Conversation, { type ConversationType } from "../../models/Conversation"
import Message, { type MessageType } from "../../models/Message"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MESSAGE_MODEL_FIELDS } from "./message.constants"
import type {
    ObjectId,
    ReplyMentionMemberContext,
    ReplyMentionRepository,
    ReplyTargetRecord,
} from "./replyMention.types"

type ConversationDocument = HydratedDocument<ConversationType>
type MessageDocument = HydratedDocument<MessageType>

/** Isolate the conversation and message reads needed to validate reply visibility.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseReplyMentionRepository implements ReplyMentionRepository {
    /** Load active member IDs and the sender's current history boundary. */
    async findMemberContext(
        conversationId: ObjectId,
        senderId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<ReplyMentionMemberContext | null> {
        const query = Conversation.findById(conversationId)
        if (transaction) query.session(transaction.session)
        const conversation = await query.exec() as ConversationDocument
        if (!conversation) return null

        const participants = conversation[CONVERSATION_FIELDS.PARTICIPANTS].filter((participant) =>
            participant[PARTICIPANT_FIELDS.DEL_FLAG] !== true,
        )
        const sender = participants.find((participant) =>
            participant[PARTICIPANT_FIELDS.USER_ID].equals(senderId),
        )
        if (!sender) return null

        return {
            joinedAt: sender[PARTICIPANT_FIELDS.JOINED_AT] ?? conversation[CONVERSATION_FIELDS.CREATED_AT],
            activeMemberIds: participants.map((participant) => participant[PARTICIPANT_FIELDS.USER_ID]),
        }
    }

    /** Find a reply target the sender can still read inside the same conversation. */
    async findReplyTarget(
        conversationId: ObjectId,
        replyToId: ObjectId,
        senderId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<ReplyTargetRecord | null> {
        const query = Message.findOne({
            [MESSAGE_MODEL_FIELDS.ID]: replyToId,
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
            [MESSAGE_MODEL_FIELDS.DEL_FLAG]: false,
            [MESSAGE_MODEL_FIELDS.HIDDEN_BY]: { $ne: senderId },
        })
        if (transaction) query.session(transaction.session)
        const message = await query.exec() as MessageDocument
        return message ? { createdAt: message[MESSAGE_MODEL_FIELDS.CREATED_AT] } : null
    }
}

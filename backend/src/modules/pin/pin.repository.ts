import { CONVERSATION_STATUS, CONVERSATION_TYPE, GROUP_FIELDS, PIN_LIMITS, ROLE } from "@linko/contracts"
import type { HydratedDocument } from "mongoose"

import Conversation from "../../models/Conversation"
import Message, { type MessageType } from "../../models/Message"
import { ATTACHMENT_FIELDS } from "../attachment/attachment.constants"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"
import type { MessageRecord } from "../message/message.types"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { AddPinRecordInput, ListVisiblePinsInput, PinConversationRecord, PinRepository } from "./pin.types"

type MessageDocument = HydratedDocument<MessageType>

/** Isolate atomic pin-array writes and viewer-filtered message reads.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongoosePinRepository implements PinRepository {
    /** Load ordered pin identifiers and the current viewer membership snapshot. */
    async findConversation(
        conversationId: AddPinRecordInput["conversationId"],
        viewerId: AddPinRecordInput["actorId"],
        transaction: TransactionContext,
    ): Promise<PinConversationRecord | null> {
        const conversation = await Conversation.findById(conversationId).session(transaction.session).exec()
        if (!conversation) return null
        const participant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((candidate) =>
            candidate[PARTICIPANT_FIELDS.USER_ID].equals(viewerId)
            && candidate[PARTICIPANT_FIELDS.DEL_FLAG] !== true,
        )
        const group = conversation[CONVERSATION_FIELDS.GROUP]
        return {
            type: conversation[CONVERSATION_FIELDS.TYPE],
            status: conversation[CONVERSATION_FIELDS.STATUS] ?? CONVERSATION_STATUS.ACTIVE,
            pinnedMessageIds: conversation[CONVERSATION_FIELDS.TYPE] === CONVERSATION_TYPE.GROUP
                ? group?.[GROUP_FIELDS.PINNED_MESSAGE_IDS] ?? []
                : [],
            member: participant ? {
                role: participant[PARTICIPANT_FIELDS.ROLE],
                joinedAt: participant[PARTICIPANT_FIELDS.JOINED_AT]
                    ?? conversation[CONVERSATION_FIELDS.CREATED_AT],
            } : null,
        }
    }

    /** Read one message only when it is active, same-group, post-join, and not hidden by the viewer. */
    async findVisibleMessage(
        conversationId: AddPinRecordInput["conversationId"],
        messageId: AddPinRecordInput["messageId"],
        viewerId: AddPinRecordInput["actorId"],
        joinedAt: Date,
        transaction: TransactionContext,
    ): Promise<MessageRecord | null> {
        const message = await Message.findOne({
            [MESSAGE_MODEL_FIELDS.ID]: messageId,
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: conversationId,
            [MESSAGE_MODEL_FIELDS.CREATED_AT]: { $gte: joinedAt },
            [MESSAGE_MODEL_FIELDS.HIDDEN_BY]: { $ne: viewerId },
            [MESSAGE_MODEL_FIELDS.DEL_FLAG]: false,
        }).session(transaction.session).exec()
        return message ? toMessageRecord(message) : null
    }

    /** Atomically prepend one pin only while fewer than three IDs exist. */
    async addPin(input: AddPinRecordInput, transaction: TransactionContext): Promise<boolean> {
        const pinsPath = `${CONVERSATION_FIELDS.GROUP}.${GROUP_FIELDS.PINNED_MESSAGE_IDS}`
        const result = await Conversation.updateOne({
            [CONVERSATION_FIELDS.ID]: input.conversationId,
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
            [CONVERSATION_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
            [`${pinsPath}.${PIN_LIMITS.MAX_PINNED_MESSAGES - 1}`]: { $exists: false },
            [pinsPath]: { $ne: input.messageId },
            [CONVERSATION_FIELDS.PARTICIPANTS]: {
                $elemMatch: {
                    [PARTICIPANT_FIELDS.USER_ID]: input.actorId,
                    [PARTICIPANT_FIELDS.ROLE]: { $in: [ROLE.OWNER, ROLE.ADMIN] },
                    [PARTICIPANT_FIELDS.DEL_FLAG]: { $ne: true },
                },
            },
        }, {
            $push: { [pinsPath]: { $each: [input.messageId], $position: 0 } },
        }, { session: transaction.session })
        return result.modifiedCount === 1
    }

    /** Pull one pin only while the actor still has owner/admin membership. */
    async removePin(input: AddPinRecordInput, transaction: TransactionContext): Promise<void> {
        await Conversation.updateOne({
            [CONVERSATION_FIELDS.ID]: input.conversationId,
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
            [CONVERSATION_FIELDS.PARTICIPANTS]: {
                $elemMatch: {
                    [PARTICIPANT_FIELDS.USER_ID]: input.actorId,
                    [PARTICIPANT_FIELDS.ROLE]: { $in: [ROLE.OWNER, ROLE.ADMIN] },
                    [PARTICIPANT_FIELDS.DEL_FLAG]: { $ne: true },
                },
            },
        }, { $pull: { [`${CONVERSATION_FIELDS.GROUP}.${GROUP_FIELDS.PINNED_MESSAGE_IDS}`]: input.messageId } }, {
            session: transaction.session,
        })
    }

    /** Return active visible messages in the same order as the conversation's pin IDs. */
    async listVisiblePins(
        input: ListVisiblePinsInput,
        transaction: TransactionContext,
    ): Promise<readonly MessageRecord[]> {
        if (input.pinnedMessageIds.length === 0) return []
        const documents = await Message.find({
            [MESSAGE_MODEL_FIELDS.ID]: { $in: input.pinnedMessageIds },
            [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: input.conversationId,
            [MESSAGE_MODEL_FIELDS.CREATED_AT]: { $gte: input.joinedAt },
            [MESSAGE_MODEL_FIELDS.HIDDEN_BY]: { $ne: input.viewerId },
            [MESSAGE_MODEL_FIELDS.DEL_FLAG]: false,
        }).session(transaction.session).exec()
        const byId = new Map(documents.map((message) => [message._id.toString(), toMessageRecord(message)]))
        return input.pinnedMessageIds.flatMap((messageId) => {
            const message = byId.get(messageId.toString())
            return message ? [message] : []
        })
    }
}

function toMessageRecord(message: MessageDocument): MessageRecord {
    return {
        id: message[MESSAGE_MODEL_FIELDS.ID],
        conversationId: message[MESSAGE_MODEL_FIELDS.CONVERSATION_ID],
        senderId: message[MESSAGE_MODEL_FIELDS.SENDER_ID],
        clientMessageId: message[MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID] ?? "",
        content: message[MESSAGE_MODEL_FIELDS.CONTENT] ?? null,
        replyToId: message[MESSAGE_MODEL_FIELDS.REPLY_TO] ?? null,
        mentions: message[MESSAGE_MODEL_FIELDS.MENTIONS] ?? [],
        attachments: (message[MESSAGE_MODEL_FIELDS.ATTACHMENTS] ?? []).map((attachment) => ({
            subdocumentId: attachment[ATTACHMENT_FIELDS.SUBDOCUMENT_ID],
            id: attachment[ATTACHMENT_FIELDS.ID] ?? "",
            url: attachment[ATTACHMENT_FIELDS.URL] ?? null,
            name: attachment[ATTACHMENT_FIELDS.NAME] ?? null,
            contentType: attachment[ATTACHMENT_FIELDS.CONTENT_TYPE] ?? null,
            size: attachment[ATTACHMENT_FIELDS.SIZE] ?? null,
        })),
        createdAt: message[MESSAGE_MODEL_FIELDS.CREATED_AT],
        updatedAt: message[MESSAGE_MODEL_FIELDS.UPDATED_AT],
    }
}

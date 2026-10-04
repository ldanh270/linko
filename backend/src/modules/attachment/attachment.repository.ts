import type { HydratedDocument } from "mongoose"

import Conversation, { type ConversationType } from "../../models/Conversation"
import Message, { type MessageType } from "../../models/Message"
import { CONVERSATION_FIELDS, PARTICIPANT_FIELDS } from "../conversation/conversation.constants"
import { ATTACHMENT_FIELDS, ATTACHMENT_STORAGE } from "./attachment.constants"
import type { AttachmentDownloadContext, AttachmentRepository, DownloadAttachmentInput } from "./attachment.types"
import { MESSAGE_MODEL_FIELDS } from "../message/message.constants"

type ConversationDocument = HydratedDocument<ConversationType>
type MessageDocument = HydratedDocument<MessageType>

/** Read private attachment references and current membership boundaries from MongoDB.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseAttachmentRepository implements AttachmentRepository {
    /** Load the target attachment and the caller's current membership time. */
    async findDownloadContext(input: DownloadAttachmentInput): Promise<AttachmentDownloadContext | null> {
        const message = await Message.findById(input.messageId).exec() as MessageDocument | null
        if (!message) return null
        const attachment = message[MESSAGE_MODEL_FIELDS.ATTACHMENTS].find((candidate) =>
            candidate[ATTACHMENT_FIELDS.SUBDOCUMENT_ID].equals(input.attachmentId),
        )
        if (!attachment) return null

        const storedId = attachment[ATTACHMENT_FIELDS.ID]
        const privateIdPrefix = `${ATTACHMENT_STORAGE.ID_PREFIX}${ATTACHMENT_STORAGE.KEY_PREFIX}/`
        if (typeof storedId !== "string" || !storedId.startsWith(privateIdPrefix)) return null
        const conversation = await Conversation.findById(message[MESSAGE_MODEL_FIELDS.CONVERSATION_ID])
            .exec() as ConversationDocument | null
        if (!conversation) return null

        const participant = conversation[CONVERSATION_FIELDS.PARTICIPANTS].find((candidate) =>
            candidate[PARTICIPANT_FIELDS.USER_ID].equals(input.userId)
            && candidate[PARTICIPANT_FIELDS.DEL_FLAG] !== true,
        )
        return {
            objectKey: storedId.slice(ATTACHMENT_STORAGE.ID_PREFIX.length),
            messageCreatedAt: message[MESSAGE_MODEL_FIELDS.CREATED_AT],
            joinedAt: participant
                ? participant[PARTICIPANT_FIELDS.JOINED_AT] ?? conversation[CONVERSATION_FIELDS.CREATED_AT]
                : null,
            name: attachment[ATTACHMENT_FIELDS.NAME] ?? "attachment",
            contentType: attachment[ATTACHMENT_FIELDS.CONTENT_TYPE] ?? "",
            size: attachment[ATTACHMENT_FIELDS.SIZE] ?? 0,
        }
    }
}

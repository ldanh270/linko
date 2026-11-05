import { CHAT_MESSAGE_KIND, MESSAGE_FIELDS, type MessageDto } from "@linko/contracts"

import { toAttachmentDto } from "../attachment/attachment.dto"
import type { MessageRecord } from "./message.types"

/** Map persistence-independent message fields to the public API contract. */
export function toMessageDto(message: MessageRecord): MessageDto {
    return {
        ...(message.kind && message.kind !== CHAT_MESSAGE_KIND.TEXT ? { [MESSAGE_FIELDS.KIND]: message.kind, [MESSAGE_FIELDS.RESOURCE_ID]: message.resourceId?.toString() ?? null } : {}),
        [MESSAGE_FIELDS.ID]: message.id.toString(),
        [MESSAGE_FIELDS.CONVERSATION_ID]: message.conversationId.toString(),
        [MESSAGE_FIELDS.SENDER_ID]: message.senderId.toString(),
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: message.clientMessageId,
        [MESSAGE_FIELDS.CONTENT]: message.content,
        [MESSAGE_FIELDS.REPLY_TO]: message.replyToId?.toString() ?? null,
        [MESSAGE_FIELDS.MENTIONS]: message.mentions.map((mention) => mention.toString()),
        [MESSAGE_FIELDS.ATTACHMENTS]: message.attachments.map((attachment) =>
            toAttachmentDto(message.id.toString(), attachment),
        ),
        [MESSAGE_FIELDS.CREATED_AT]: message.createdAt.toISOString(),
        [MESSAGE_FIELDS.UPDATED_AT]: message.updatedAt.toISOString(),
    }
}

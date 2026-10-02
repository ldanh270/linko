import { MESSAGE_FIELDS, type MessageDto } from "@linko/contracts"

import type { MessageRecord } from "./message.types"

/** Map persistence-independent message fields to the public API contract. */
export function toMessageDto(message: MessageRecord): MessageDto {
    return {
        [MESSAGE_FIELDS.ID]: message.id.toString(),
        [MESSAGE_FIELDS.CONVERSATION_ID]: message.conversationId.toString(),
        [MESSAGE_FIELDS.SENDER_ID]: message.senderId.toString(),
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: message.clientMessageId,
        [MESSAGE_FIELDS.CONTENT]: message.content,
        [MESSAGE_FIELDS.CREATED_AT]: message.createdAt.toISOString(),
        [MESSAGE_FIELDS.UPDATED_AT]: message.updatedAt.toISOString(),
    }
}

import { MEMBERSHIP_FIELDS, MESSAGE_FIELDS, MESSAGE_LIMITS } from "@linko/contracts"

/** MongoDB fields persisted on messages and selected by message repositories. */
export const MESSAGE_MODEL_FIELDS = {
    ID: "_id",
    CONVERSATION_ID: "conversationId",
    SENDER_ID: "senderId",
    CLIENT_MESSAGE_ID: "clientMessageId",
    CONTENT: "content",
    REPLY_TO: "replyTo",
    MENTIONS: "mentions",
    ATTACHMENTS: "attachments",
    REACTIONS: "reactions",
    HIDDEN_BY: "hiddenBy",
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
    DEL_FLAG: "delFlag",
} as const

/** Stable safe messages used by the message service. */
export const MESSAGE_ERROR_MESSAGES = {
    CONVERSATION_NOT_FOUND: "Conversation not found",
    NOT_A_MEMBER: "Current conversation membership is required",
    FRIENDSHIP_REQUIRED: "An active friendship is required to send a direct message",
    GROUP_CLOSED: "This group has been closed",
    EMPTY_CONTENT: "Message content must contain non-whitespace characters",
    CONTENT_TOO_LONG: `Message content must not exceed ${MESSAGE_LIMITS.MAX_CONTENT_LENGTH} characters`,
    INVALID_CLIENT_MESSAGE_ID: "Client message identifier is invalid",
    INVALID_CURSOR: "Message cursor is invalid",
    INVALID_PAGE_LIMIT: "Message page limit is invalid",
    INVALID_RECORD: "Stored message is missing required fields",
} as const

/** Operation input keys assembled by HTTP controllers before service calls. */
export const MESSAGE_OPERATION_FIELDS = {
    CONVERSATION_ID: MESSAGE_FIELDS.CONVERSATION_ID,
    SENDER_ID: MESSAGE_FIELDS.SENDER_ID,
    USER_ID: MEMBERSHIP_FIELDS.USER_ID,
    CLIENT_MESSAGE_ID: MESSAGE_FIELDS.CLIENT_MESSAGE_ID,
    CONTENT: MESSAGE_FIELDS.CONTENT,
} as const

/** Verify the ObjectId portion of an opaque stable history cursor. */
export const MESSAGE_CURSOR_ID_PATTERN = /^[a-f\d]{24}$/i

/** MongoDB index names used by idempotent writes and stable cursor scans. */
export const MESSAGE_INDEX_NAMES = {
    IDEMPOTENCY: "message_sender_client_idempotency_unique",
    CURSOR: "message_conversation_created_id_cursor",
} as const

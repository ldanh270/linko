import { CURSOR_PAGE_FIELDS, MESSAGE_FIELDS } from "./constants"
import type { EntityId } from "./envelope"

/** Message data safe to return from authenticated conversation endpoints. */
export interface MessageDto {
    readonly [MESSAGE_FIELDS.ID]: EntityId
    readonly [MESSAGE_FIELDS.CONVERSATION_ID]: EntityId
    readonly [MESSAGE_FIELDS.SENDER_ID]: EntityId
    readonly [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: string
    readonly [MESSAGE_FIELDS.CONTENT]: string | null
    readonly [MESSAGE_FIELDS.REPLY_TO]: EntityId | null
    readonly [MESSAGE_FIELDS.MENTIONS]: readonly EntityId[]
    readonly [MESSAGE_FIELDS.CREATED_AT]: string
    readonly [MESSAGE_FIELDS.UPDATED_AT]: string
}

/** Message request accepted by the authenticated send endpoint. */
export interface SendMessageRequest {
    readonly [MESSAGE_FIELDS.CONVERSATION_ID]: EntityId
    readonly [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: string
    readonly [MESSAGE_FIELDS.CONTENT]: string
    readonly [MESSAGE_FIELDS.REPLY_TO]?: EntityId
    readonly [MESSAGE_FIELDS.MENTIONS]?: readonly EntityId[]
}

/** Stable cursor page shape shared by conversation history consumers. */
export interface CursorPage<T> {
    readonly [CURSOR_PAGE_FIELDS.ITEMS]: readonly T[]
    readonly [CURSOR_PAGE_FIELDS.NEXT_CURSOR]: string | null
}

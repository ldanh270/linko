import { READ_FIELDS, READ_REQUEST_FIELDS } from "./constants"
import type { EntityId } from "./envelope"

/** Per-user read cursor and unread count returned after a conversation read. */
export interface ReadStateDto {
    readonly [READ_FIELDS.CONVERSATION_ID]: EntityId
    readonly [READ_FIELDS.LAST_READ_AT]: string | null
    readonly [READ_FIELDS.LAST_READ_MESSAGE_ID]: EntityId | null
    readonly [READ_FIELDS.UNREAD_COUNT]: number
}

/** Current visible message used to advance one participant's read cursor. */
export interface MarkConversationReadRequest {
    readonly [READ_REQUEST_FIELDS.LAST_VISIBLE_MESSAGE_ID]: EntityId
}

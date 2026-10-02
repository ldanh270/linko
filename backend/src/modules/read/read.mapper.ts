import { READ_FIELDS, type ReadStateDto } from "@linko/contracts"

import type { ReadStateRecord } from "./read.types"

/** Map a stored participant read cursor and unread count to the API contract. */
export function toReadStateDto(state: ReadStateRecord): ReadStateDto {
    return {
        [READ_FIELDS.CONVERSATION_ID]: state.conversationId.toString(),
        [READ_FIELDS.LAST_READ_AT]: state.lastReadAt?.toISOString() ?? null,
        [READ_FIELDS.LAST_READ_MESSAGE_ID]: state.lastReadMessageId?.toString() ?? null,
        [READ_FIELDS.UNREAD_COUNT]: state.unreadCount,
    }
}

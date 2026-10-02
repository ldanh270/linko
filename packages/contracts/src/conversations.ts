import {
    CONVERSATION_DTO_FIELDS,
    INBOX_FIELDS,
    INBOX_MESSAGE_FIELDS,
    INBOX_PARTICIPANT_FIELDS,
    GROUP_FIELDS,
    MESSAGE_FIELDS,
    type ConversationStatus,
    type ConversationType,
} from "./constants"
import type { EntityId } from "./envelope"

/** Safe participant details used by the authenticated conversation inbox. */
export interface ConversationParticipantSummaryDto {
    readonly [INBOX_PARTICIPANT_FIELDS.ID]: EntityId
    readonly [INBOX_PARTICIPANT_FIELDS.DISPLAY_NAME]: string | null
    readonly [INBOX_PARTICIPANT_FIELDS.AVATAR_URL]: string | null
    readonly [INBOX_PARTICIPANT_FIELDS.JOINED_AT]: string | null
}

/** Safe last-message preview used by the authenticated conversation inbox. */
export interface ConversationLastMessageSummaryDto {
    readonly [MESSAGE_FIELDS.ID]: EntityId | null
    readonly [INBOX_MESSAGE_FIELDS.SENDER]: {
        readonly [INBOX_PARTICIPANT_FIELDS.ID]: EntityId
        readonly [INBOX_PARTICIPANT_FIELDS.DISPLAY_NAME]: string | null
        readonly [INBOX_PARTICIPANT_FIELDS.AVATAR_URL]: string | null
    } | null
    readonly [MESSAGE_FIELDS.CONTENT]: string | null
    readonly [MESSAGE_FIELDS.CREATED_AT]: string | null
}

/** Minimal group details visible in a conversation inbox row. */
export interface ConversationGroupSummaryDto {
    readonly [GROUP_FIELDS.NAME]: string
    readonly [GROUP_FIELDS.DESCRIPTION]: string | null
    readonly [GROUP_FIELDS.AVATAR_URL]: string | null
}

/** Safe group or direct conversation data returned by the unfiltered inbox route. */
export interface InboxItemDto {
    readonly [INBOX_FIELDS.ID]: EntityId
    readonly [INBOX_FIELDS.TYPE]: ConversationType
    readonly [CONVERSATION_DTO_FIELDS.STATUS]: ConversationStatus
    readonly [INBOX_FIELDS.PARTICIPANTS]: readonly ConversationParticipantSummaryDto[]
    readonly [INBOX_FIELDS.UNREAD_COUNT]: number
    readonly [INBOX_FIELDS.LAST_MESSAGE]: ConversationLastMessageSummaryDto | null
    readonly [INBOX_FIELDS.GROUP]: ConversationGroupSummaryDto | null
    readonly [INBOX_FIELDS.CREATED_AT]: string
    readonly [INBOX_FIELDS.UPDATED_AT]: string
}

/** Compatibility name for inbox rows returned by earlier contract consumers. */
export type ConversationSummaryDto = InboxItemDto

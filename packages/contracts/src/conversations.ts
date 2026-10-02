import { CONVERSATION_DTO_FIELDS, type ConversationStatus, type ConversationType } from "./constants"
import type { EntityId } from "./envelope"

/** Safe participant details used by the authenticated conversation inbox. */
export interface ConversationParticipantSummaryDto {
    readonly id: EntityId
    readonly displayName: string | null
    readonly avatarUrl: string | null
    readonly joinedAt: string | null
}

/** Safe last-message preview used by the authenticated conversation inbox. */
export interface ConversationLastMessageSummaryDto {
    readonly id: EntityId | null
    readonly sender: {
        readonly id: EntityId
        readonly displayName: string | null
        readonly avatarUrl: string | null
    } | null
    readonly content: string | null
    readonly createdAt: string | null
}

/** Minimal group details visible in a conversation inbox row. */
export interface ConversationGroupSummaryDto {
    readonly name: string
    readonly description: string | null
    readonly avatarUrl: string | null
}

/** Safe group or direct conversation data returned by the unfiltered inbox route. */
export interface ConversationSummaryDto {
    readonly id: EntityId
    readonly type: ConversationType
    readonly [CONVERSATION_DTO_FIELDS.STATUS]: ConversationStatus
    readonly participants: readonly ConversationParticipantSummaryDto[]
    readonly unreadCount: Readonly<Record<string, number>>
    readonly lastMessage: ConversationLastMessageSummaryDto | null
    readonly group: ConversationGroupSummaryDto | null
    readonly createdAt: string
    readonly updatedAt: string
}

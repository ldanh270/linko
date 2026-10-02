import type {
    ConversationKind,
    ConversationStatus,
    ConversationType,
    CursorPage,
    InboxItemDto,
} from "@linko/contracts"
import type { Types } from "mongoose"

/** MongoDB ObjectId used for inbox lookups and stable cursor tie-breaking. */
export type ObjectId = Types.ObjectId

/** Cursor boundary sorted by visible activity and then conversation identifier. */
export interface InboxCursor {
    readonly activityAt: Date
    readonly id: ObjectId
}

/** Participant profile safe to include in one current inbox item. */
export interface InboxParticipantRecord {
    readonly id: ObjectId
    readonly displayName: string | null
    readonly avatarUrl: string | null
    readonly joinedAt: Date | null
}

/** Message summary visible since the current member joined the conversation. */
export interface InboxMessageRecord {
    readonly id: ObjectId | null
    readonly sender: {
        readonly id: ObjectId
        readonly displayName: string | null
        readonly avatarUrl: string | null
    } | null
    readonly content: string | null
    readonly createdAt: Date | null
}

/** Group profile safe to return in the conversation inbox. */
export interface InboxGroupRecord {
    readonly name: string
    readonly description: string | null
    readonly avatarUrl: string | null
}

/** Persistence-independent data mapped into an authenticated inbox item. */
export interface InboxItemRecord {
    readonly id: ObjectId
    readonly type: ConversationType
    readonly status: ConversationStatus
    readonly participants: readonly InboxParticipantRecord[]
    readonly unreadCount: number
    readonly lastMessage: InboxMessageRecord | null
    readonly group: InboxGroupRecord | null
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly activityAt: Date
}

/** Repository filters after service decoding and authorization input. */
export interface InboxPageQuery {
    readonly userId: ObjectId
    readonly kind: ConversationKind
    readonly cursor: InboxCursor | null
    readonly limit: number
}

/** One bounded repository page plus a marker for older matching conversations. */
export interface InboxPageRecord {
    readonly items: readonly InboxItemRecord[]
    readonly hasMore: boolean
}

/** Persistence operations required by inbox listing. */
export interface InboxRepository {
    /** Find one current participant's filtered page in stable visible-activity order. */
    findPage(input: InboxPageQuery): Promise<InboxPageRecord>
}

/** Constructor dependencies for the inbox domain service. */
export interface InboxServiceDependencies {
    readonly repository: InboxRepository
}

/** Validated inbox list request from an authenticated user. */
export interface ListInboxInput {
    readonly userId: ObjectId
    readonly kind: ConversationKind
    readonly cursor?: string
    readonly limit: number
}

/** Cursor-page response mapped to the shared safe inbox DTO. */
export type InboxPageDto = CursorPage<InboxItemDto>

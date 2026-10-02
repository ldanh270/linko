import type {
    ConversationGroupSummaryDto,
    ConversationLastMessageSummaryDto,
    ConversationParticipantSummaryDto,
    ConversationSummaryDto,
    ConversationStatus,
    ConversationType,
    GroupDto,
    GroupSummaryDto,
    Role,
} from "@linko/contracts"
import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** A MongoDB ObjectId used for persistence-facing group operations. */
export type ObjectId = Types.ObjectId

/** Image bytes and declared MIME type accepted by the public group avatar adapter. */
export interface GroupAvatarFile {
    readonly buffer: Buffer
    readonly mimetype: string
}

/** Public object metadata stored with a group conversation. */
export interface GroupAvatarRecord {
    readonly url: string
    readonly id: string
}

/** One participant's persisted role within a group conversation. */
export interface GroupParticipantRecord {
    readonly userId: ObjectId
    readonly role: Role
}

/** Domain data required to create or describe a group without a Mongoose document. */
export interface GroupRecord {
    readonly id: ObjectId
    readonly ownerId: ObjectId
    readonly name: string
    readonly description: string | null
    readonly avatar: GroupAvatarRecord | null
    readonly status: ConversationStatus
    readonly participants: readonly GroupParticipantRecord[]
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly lastMessageAt?: Date | null
}

/** Domain data for a group list row, including its visible member count. */
export interface GroupSummaryRecord extends GroupRecord {
    readonly memberCount: number
}

/** Conversation participant fields required to render one inbox row. */
export interface ConversationParticipantSummaryRecord {
    readonly userId: ObjectId
    readonly displayName: string | null
    readonly avatarUrl: string | null
    readonly joinedAt: Date | null
}

/** Safe last-message fields required to render one inbox preview. */
export interface ConversationLastMessageSummaryRecord {
    readonly id: ObjectId | null
    readonly sender: {
        readonly id: ObjectId
        readonly displayName: string | null
        readonly avatarUrl: string | null
    } | null
    readonly content: string | null
    readonly createdAt: Date | null
}

/** Group metadata visible inside an inbox conversation row. */
export interface ConversationGroupSummaryRecord {
    readonly name: string
    readonly description: string | null
    readonly avatarUrl: string | null
}

/** Safe persistence-independent data needed by the existing inbox route. */
export interface ConversationSummaryRecord {
    readonly id: ObjectId
    readonly type: ConversationType
    readonly status: ConversationStatus
    readonly participants: readonly ConversationParticipantSummaryRecord[]
    readonly unreadCount: Readonly<Record<string, number>>
    readonly lastMessage: ConversationLastMessageSummaryRecord | null
    readonly group: ConversationGroupSummaryRecord | null
    readonly createdAt: Date
    readonly updatedAt: Date
}

/** Input to the repository after service validation and avatar upload. */
export interface CreateGroupRecord {
    readonly ownerId: ObjectId
    readonly name: string
    readonly description: string | null
    readonly avatar: GroupAvatarRecord | null
}

/** Fields changed by one owner or admin group update. */
export interface UpdateGroupRecord {
    readonly name?: string
    readonly description?: string | null
    readonly avatar?: GroupAvatarRecord
}

/** Result of reserving one of a user's allowed group slots in a transaction. */
export type GroupSlotReservation = "reserved" | "limit" | "missing"

/** Service input includes the authenticated owner identity and an optional image upload. */
export interface CreateGroupInput {
    readonly ownerId: ObjectId
    readonly name: string
    readonly description?: string
    readonly avatar?: GroupAvatarFile
}

/** Service input includes the group, authenticated actor, and fields to update. */
export interface UpdateGroupInput {
    readonly conversationId: ObjectId
    readonly actorId: ObjectId
    readonly name?: string
    readonly description?: string
    readonly avatar?: GroupAvatarFile
}

/** Persistence operations required by the conversation group use cases. */
export interface ConversationRepository {
    /** Reserve a user group slot atomically within the caller's transaction. */
    reserveGroupSlot(ownerId: ObjectId, limit: number, transaction: TransactionContext): Promise<GroupSlotReservation>
    /** Insert a private group containing only its owner. */
    createGroup(input: CreateGroupRecord, transaction: TransactionContext): Promise<GroupRecord>
    /** Find active groups the user currently participates in. */
    findGroupsByParticipant(userId: ObjectId): Promise<readonly GroupSummaryRecord[]>
    /** Find every active group or direct conversation where the user participates. */
    findConversationsByParticipant(userId: ObjectId): Promise<readonly ConversationSummaryRecord[]>
    /** Load one group record, optionally using the caller's transaction. */
    findGroupById(conversationId: ObjectId, transaction?: TransactionContext): Promise<GroupRecord | null>
    /** Apply validated group fields and return the updated record. */
    updateGroup(conversationId: ObjectId, input: UpdateGroupRecord, transaction: TransactionContext): Promise<GroupRecord | null>
}

/** Store and remove public group avatar objects without exposing R2 to the service. */
export interface GroupAvatarStorage {
    /** Validate, normalize, and upload a public avatar for a group owner. */
    upload(ownerId: ObjectId, file: GroupAvatarFile): Promise<GroupAvatarRecord>
    /** Remove a newly uploaded or replaced avatar object. */
    delete(avatar: GroupAvatarRecord): Promise<void>
}

/** Record a committed avatar replacement whose old public object still needs deletion. */
export interface GroupAvatarCleanupFailureRecorder {
    /** Record safe object identifiers and error context for later cleanup retry. */
    recordFailure(avatar: GroupAvatarRecord, groupId: ObjectId, error: unknown, actorId: ObjectId): void
}

/** Execute group changes atomically with MongoDB transactions. */
export interface ConversationTransactionRunner {
    /** Run one service operation in a transaction and return its result. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Constructor dependencies for the conversation group use cases. */
export interface ConversationServiceDependencies {
    readonly repository: ConversationRepository
    readonly transactionRunner: ConversationTransactionRunner
    readonly avatarStorage: GroupAvatarStorage
    readonly avatarCleanupFailureRecorder: GroupAvatarCleanupFailureRecorder
}

/** Public response DTOs shared with the HTTP adapter. */
export type {
    ConversationGroupSummaryDto,
    ConversationLastMessageSummaryDto,
    ConversationParticipantSummaryDto,
    ConversationSummaryDto,
    GroupDto,
    GroupSummaryDto,
}

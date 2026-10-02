import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** MongoDB ObjectId used by read-state persistence operations. */
export type ObjectId = Types.ObjectId

/** Current member fields required to authorize and advance a read cursor. */
export interface ReadParticipantRecord {
    readonly conversationId: ObjectId
    readonly userId: ObjectId
    readonly joinedAt: Date
    readonly lastReadAt: Date | null
    readonly lastReadMessageId: ObjectId | null
}

/** Timestamped message boundary accepted as a visible read target. */
export interface VisibleMessageRecord {
    readonly id: ObjectId
    readonly createdAt: Date
}

/** Cursor used to count messages visible after the reader's current progress. */
export interface ReadCursor {
    readonly createdAt: Date
    readonly messageId: ObjectId
}

/** Read-state fields persisted for one current participant. */
export interface ReadStateRecord {
    readonly conversationId: ObjectId
    readonly lastReadAt: Date | null
    readonly lastReadMessageId: ObjectId | null
    readonly unreadCount: number
}

/** Read participant and message count query constrained to one membership window. */
export interface CountUnreadInput {
    readonly conversationId: ObjectId
    readonly userId: ObjectId
    readonly joinedAt: Date
    readonly cursor: ReadCursor | null
    readonly at: Date
}

/** Fields needed to atomically persist the read cursor and recipient count. */
export interface UpdateReadStateInput {
    readonly conversationId: ObjectId
    readonly userId: ObjectId
    readonly lastReadAt: Date
    readonly lastReadMessageId: ObjectId
    readonly unreadCount: number
}

/** Persistence operations required by the read-state domain service. */
export interface ReadStateRepository {
    /** Load one active participant and their current cursor inside an optional transaction. */
    findCurrentMember(
        conversationId: ObjectId,
        userId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<ReadParticipantRecord | null>
    /** Load a message in the same conversation and membership visibility window. */
    findVisibleMessage(
        conversationId: ObjectId,
        messageId: ObjectId,
        joinedAt: Date,
        at: Date,
        transaction: TransactionContext,
    ): Promise<VisibleMessageRecord | null>
    /** Count only other senders' messages visible after one read cursor. */
    countUnread(input: CountUnreadInput, transaction?: TransactionContext): Promise<number>
    /** Persist the participant cursor and their inbox count in one conversation write. */
    updateReadState(input: UpdateReadStateInput, transaction: TransactionContext): Promise<ReadStateRecord | null>
}

/** Execute read operations using the shared MongoDB transaction boundary. */
export interface ReadStateTransactionRunner {
    /** Run one read-state operation with an isolated transaction context. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Provide deterministic UTC time to visibility and unread calculations. */
export interface ReadStateClock {
    /** Return the current UTC instant. */
    now(): Date
}

/** Constructor dependencies for read-state business rules. */
export interface ReadStateServiceDependencies {
    readonly repository: ReadStateRepository
    readonly transactionRunner: ReadStateTransactionRunner
    readonly clock: ReadStateClock
}

/** Authenticated cursor advancement request from the current participant. */
export interface MarkReadInput {
    readonly conversationId: ObjectId
    readonly userId: ObjectId
    readonly lastVisibleMessageId: ObjectId
}

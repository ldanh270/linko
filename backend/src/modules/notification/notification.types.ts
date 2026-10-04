import type { ConversationType } from "@linko/contracts"
import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** MongoDB ObjectId used by notification preference operations. */
export type ObjectId = Types.ObjectId

/** Current participant preference fields needed to apply rollout compatibility. */
export interface NotificationPreferenceMemberRecord {
    readonly conversationType: ConversationType
    readonly isMuted: boolean | null
    readonly mutedUntil: Date | null
}

/** Persistence operations for one member's conversation notification preference. */
export interface NotificationPreferenceRepository {
    /** Find a current participant and their preference, preserving absent legacy fields. */
    findCurrentMember(
        conversationId: ObjectId,
        userId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<NotificationPreferenceMemberRecord | null>
    /** Set the new boolean preference and clear its legacy expiry within one transaction. */
    setMuted(
        conversationId: ObjectId,
        userId: ObjectId,
        isMuted: boolean,
        transaction: TransactionContext,
    ): Promise<NotificationPreferenceMemberRecord | null>
}

/** Execute preference operations with the shared MongoDB transaction boundary. */
export interface NotificationPreferenceTransactionRunner {
    /** Run one notification preference operation with an isolated session. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Provide deterministic UTC time while interpreting legacy mute expiries. */
export interface NotificationPreferenceClock {
    /** Return the current UTC instant. */
    now(): Date
}

/** Constructor dependencies for notification preference business rules. */
export interface NotificationPreferenceServiceDependencies {
    readonly repository: NotificationPreferenceRepository
    readonly transactionRunner: NotificationPreferenceTransactionRunner
    readonly clock: NotificationPreferenceClock
}

/** Authenticated request to update one participant's group toast preference. */
export interface SetMutedInput {
    readonly conversationId: ObjectId
    readonly userId: ObjectId
    readonly isMuted: boolean
}

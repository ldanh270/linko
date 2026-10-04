import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { ObjectId, GroupRecord } from "./conversation.types"
import type { RealtimeMembershipRevoker } from "../realtime/realtime.types"

/** Authenticated actor and group identifiers for a self-leave operation. */
export interface LeaveGroupInput {
    readonly conversationId: ObjectId
    readonly actorId: ObjectId
}

/** Authenticated owner and group identifiers for a close operation. */
export interface CloseGroupInput {
    readonly conversationId: ObjectId
    readonly actorId: ObjectId
}

/** Persistence mutations required by group leave and close use cases. */
export interface ConversationLifecycleRepository {
    /** Tombstone one current participant and optionally close an empty owner-only group. */
    leaveParticipant(
        input: LeaveParticipantRecordInput,
        transaction: TransactionContext,
    ): Promise<boolean>
    /** Mark one group closed without deleting its conversation history. */
    closeGroup(conversationId: ObjectId, transaction: TransactionContext): Promise<boolean>
}

/** Validated participant departure values passed to persistence. */
export interface LeaveParticipantRecordInput extends LeaveGroupInput {
    readonly leftAt: Date
    readonly closeEmptyGroup: boolean
}

/** Read-only group state required for current-role and response mapping. */
export interface ConversationLifecycleGroupReader {
    /** Load one group record, optionally within the caller's transaction. */
    findGroupById(conversationId: ObjectId, transaction?: TransactionContext): Promise<GroupRecord | null>
}

/** Invitation operation shared with F04 for atomic group closure. */
export interface ConversationLifecycleInvitationRevoker {
    /** Revoke every open link for a group in the caller's transaction. */
    revokeUnrevokedInvitations(
        conversationId: ObjectId,
        revokedAt: Date,
        transaction: TransactionContext,
    ): Promise<void>
}

/** UTC clock used for participant departure and invitation revocation timestamps. */
export interface ConversationLifecycleClock {
    /** Return the current UTC instant. */
    now(): Date
}

/** Constructor collaborators for group lifecycle rules. */
export interface ConversationLifecycleServiceDependencies {
    readonly repository: ConversationLifecycleRepository
    readonly groupReader: ConversationLifecycleGroupReader
    readonly invitationRevoker: ConversationLifecycleInvitationRevoker
    readonly transactionRunner: ConversationLifecycleTransactionRunner
    readonly clock: ConversationLifecycleClock
    readonly membershipRevoker?: RealtimeMembershipRevoker
}

/** Execute lifecycle writes atomically across conversation and invitation documents. */
export interface ConversationLifecycleTransactionRunner {
    /** Run one lifecycle operation in a MongoDB transaction. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

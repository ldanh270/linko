import type { InvitationPreviewDto, InvitationSummaryDto, IssuedInvitationDto, Role } from "@linko/contracts"
import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** MongoDB ObjectId used by persistence-facing invitation operations. */
export type ObjectId = Types.ObjectId

/** Current group roles needed to authorize invitation management. */
export interface InvitationParticipantRecord {
    readonly userId: ObjectId
    readonly role: Role
}

/** Group membership data the service needs before exposing invitation metadata. */
export interface InvitationGroupAccessRecord {
    readonly participants: readonly InvitationParticipantRecord[]
}

/** Internal invitation fields used by the service; tokenHash never crosses the API boundary. */
export interface InvitationRecord {
    readonly id: ObjectId
    readonly conversationId: ObjectId
    readonly tokenHash: string
    readonly expiresAt: Date
    readonly maxUses: number
    readonly useCount: number
    readonly revokedAt: Date | null
    readonly createdAt: Date
}

/** Invitation metadata selected for management lists without the token hash. */
export interface InvitationSummaryRecord {
    readonly id: ObjectId
    readonly expiresAt: Date
    readonly maxUses: number
    readonly useCount: number
    readonly revokedAt: Date | null
    readonly createdAt: Date
}

/** Public group details safe to show before a user accepts an invitation. */
export interface InvitationPublicGroupPreviewRecord {
    readonly name: string
    readonly description: string | null
    readonly avatarUrl: string | null
    readonly memberCount: number
}

/** New persisted values accepted after service validation. */
export interface CreateInvitationRecord {
    readonly conversationId: ObjectId
    readonly tokenHash: string
}

/** Authenticated actor and target group for issuing or listing invitations. */
export interface ManageInvitationsInput {
    readonly conversationId: ObjectId
    readonly actorId: ObjectId
}

/** Authenticated actor, group, and invitation for a revoke operation. */
export interface RevokeInvitationInput extends ManageInvitationsInput {
    readonly invitationId: ObjectId
}

/** Database operations required by the invitation use cases. */
export interface InvitationRepository {
    /** Read one group's current participant roles, optionally in a transaction. */
    findGroupAccess(
        conversationId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<InvitationGroupAccessRecord | null>
    /** Revoke the prior unrevoked link before the next one is stored. */
    revokeUnrevokedInvitations(
        conversationId: ObjectId,
        revokedAt: Date,
        transaction: TransactionContext,
    ): Promise<void>
    /** Store a new hashed invitation and return its generated metadata. */
    createInvitation(input: CreateInvitationRecord, transaction: TransactionContext): Promise<InvitationRecord>
    /** Read one invitation only when it belongs to the requested group. */
    findInvitation(
        invitationId: ObjectId,
        conversationId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<InvitationRecord | null>
    /** Resolve one invitation using only the digest of its raw URL token. */
    findInvitationByTokenHash(tokenHash: string): Promise<InvitationRecord | null>
    /** Load the limited group fields allowed on a public invitation preview. */
    findPublicGroupPreview(conversationId: ObjectId): Promise<InvitationPublicGroupPreviewRecord | null>
    /** List safe invitation metadata in creation order. */
    listInvitations(conversationId: ObjectId): Promise<readonly InvitationSummaryRecord[]>
    /** Set the revocation timestamp on an invitation within its group. */
    revokeInvitation(
        invitationId: ObjectId,
        conversationId: ObjectId,
        revokedAt: Date,
        transaction: TransactionContext,
    ): Promise<void>
}

/** Execute an issue or revoke operation atomically. */
export interface InvitationTransactionRunner {
    /** Run one invitation operation in a MongoDB transaction. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Constructor dependencies for the invitation business rules. */
export interface InvitationServiceDependencies {
    readonly repository: InvitationRepository
    readonly transactionRunner: InvitationTransactionRunner
    readonly clientOrigin: string
}

/** Shared API result shapes returned by invitation service operations. */
export type { InvitationPreviewDto, InvitationSummaryDto, IssuedInvitationDto }

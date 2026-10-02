import type { GroupMemberRole, MemberDto } from "@linko/contracts"
import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { MEMBERSHIP_ADD_OUTCOMES } from "./membership.constants"

/** MongoDB ObjectId used by membership domain operations. */
export type ObjectId = Types.ObjectId

/** Persisted member fields needed for authorization and safe DTO mapping. */
export interface MembershipMemberRecord {
    readonly userId: ObjectId
    readonly role: GroupMemberRole
    readonly displayName: string | null
    readonly avatarUrl: string | null
    readonly joinedAt: Date | null
}

/** Group membership snapshot loaded by the membership repository. */
export interface MembershipGroupRecord {
    readonly conversationId: ObjectId
    readonly ownerId: ObjectId
    readonly members: readonly MembershipMemberRecord[]
}

/** Invitation workflow input for adding the authenticated invitee to a group. */
export interface AddMemberInput {
    readonly conversationId: ObjectId
    readonly userId: ObjectId
}

/** Invitation member result needed to avoid charging repeat acceptance attempts. */
export interface AddMemberFromInvitationResult {
    readonly member: MemberDto
    readonly wasAdded: boolean
}

/** Authenticated request to change one member's role. */
export interface ChangeRoleInput {
    readonly conversationId: ObjectId
    readonly actorId: ObjectId
    readonly targetUserId: ObjectId
    readonly role: GroupMemberRole
}

/** Authenticated request to remove one non-owner group member. */
export interface RemoveMemberInput {
    readonly conversationId: ObjectId
    readonly actorId: ObjectId
    readonly targetUserId: ObjectId
}

/** Authenticated request to transfer group ownership to a current member. */
export interface TransferOwnerInput {
    readonly conversationId: ObjectId
    readonly actorId: ObjectId
    readonly newOwnerId: ObjectId
}

/** Data required to atomically append one invitation participant. */
export interface AddMemberRecordInput extends AddMemberInput {
    readonly joinedAt: Date
}

/** Result of one transaction-scoped membership insert attempt. */
export type AddMemberResult =
    | { readonly outcome: typeof MEMBERSHIP_ADD_OUTCOMES.ADDED; readonly member: MembershipMemberRecord }
    | { readonly outcome: typeof MEMBERSHIP_ADD_OUTCOMES.EXISTING; readonly member: MembershipMemberRecord }
    | { readonly outcome: typeof MEMBERSHIP_ADD_OUTCOMES.LIMIT }
    | { readonly outcome: typeof MEMBERSHIP_ADD_OUTCOMES.MISSING }
    | { readonly outcome: typeof MEMBERSHIP_ADD_OUTCOMES.STALE }

/** Expected roles used to guard one conditional group role update. */
export interface ChangeRoleRecordInput extends ChangeRoleInput {
    readonly actorRole: GroupMemberRole
    readonly targetRole: GroupMemberRole
}

/** Expected roles used to guard one conditional member removal. */
export interface RemoveMemberRecordInput extends RemoveMemberInput {
    readonly actorRole: GroupMemberRole
    readonly targetRole: GroupMemberRole
}

/** Expected old and target roles used for atomic ownership transfer. */
export interface TransferOwnerRecordInput extends TransferOwnerInput {
    readonly newOwnerRole: GroupMemberRole
}

/** Persistence operations required by the membership use cases. */
export interface MembershipRepository {
    /** Read an active group and safe member profiles, optionally in a transaction. */
    findGroup(conversationId: ObjectId, transaction?: TransactionContext): Promise<MembershipGroupRecord | null>
    /** Add a new member or report duplicate, capacity, and stale-state outcomes. */
    addMember(input: AddMemberRecordInput, transaction: TransactionContext): Promise<AddMemberResult>
    /** Apply a role only while both actor and target roles still match the snapshot. */
    changeRole(input: ChangeRoleRecordInput, transaction: TransactionContext): Promise<MembershipMemberRecord | null>
    /** Remove a target only while actor and target roles still match the snapshot. */
    removeMember(input: RemoveMemberRecordInput, transaction: TransactionContext): Promise<boolean>
    /** Change group owner and both embedded roles in one MongoDB document update. */
    transferOwner(input: TransferOwnerRecordInput, transaction: TransactionContext): Promise<boolean>
}

/** Run role and membership changes in MongoDB transactions. */
export interface MembershipTransactionRunner {
    /** Run one service operation within a transaction. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Provide deterministic UTC timestamps to invitation membership operations. */
export interface MembershipClock {
    /** Return the current UTC instant. */
    now(): Date
}

/** Constructor collaborators for membership domain use cases. */
export interface MembershipServiceDependencies {
    readonly repository: MembershipRepository
    readonly transactionRunner: MembershipTransactionRunner
    readonly clock: MembershipClock
}

/** Public member result returned by membership endpoints. */
export type { MemberDto }

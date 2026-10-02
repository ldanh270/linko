import { ERROR_CODES, GROUP_LIMITS, ROLE, type GroupMemberRole, type MemberDto } from "@linko/contracts"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { MEMBERSHIP_ADD_OUTCOMES, MEMBERSHIP_MESSAGES, MEMBERSHIP_OPERATION_FIELDS } from "./membership.constants"
import { toMemberDto } from "./membership.mapper"
import type {
    AddMemberInput,
    AddMemberFromInvitationResult,
    ChangeRoleInput,
    MembershipGroupRecord,
    MembershipMemberRecord,
    MembershipServiceDependencies,
    ObjectId,
    RemoveMemberInput,
    TransferOwnerInput,
} from "./membership.types"

/** Enforce group member visibility, role changes, removal, and ownership transfer.
 *
 * Membership role checks run again inside each transaction so stale UI state cannot grant access.
 *
 * @layer Service
 */
export class MembershipService {
    /** Bind membership persistence, transaction, and clock collaborators. */
    constructor(private readonly dependencies: MembershipServiceDependencies) {}

    /** List member profiles only to an active group participant. */
    async list(conversationId: ObjectId, actorId: ObjectId): Promise<MemberDto[]> {
        const group = await this.getGroup(conversationId)
        this.getMember(group, actorId)
        return group.members.map(toMemberDto)
    }

    /** Add an invitation recipient at the current membership boundary. */
    async addFromInvitation(
        input: AddMemberInput,
        transaction: TransactionContext,
    ): Promise<AddMemberFromInvitationResult> {
        const group = await this.getGroup(input[MEMBERSHIP_OPERATION_FIELDS.CONVERSATION_ID], transaction)
        const existingMember = group.members.find(({ userId }) => userId.equals(input.userId))
        if (existingMember) return { member: toMemberDto(existingMember), wasAdded: false }
        if (group.members.length >= GROUP_LIMITS.MAX_MEMBERS_PER_GROUP) {
            throw new ConflictException(ERROR_CODES.GROUP_LIMIT, MEMBERSHIP_MESSAGES.MEMBER_LIMIT)
        }

        const result = await this.dependencies.repository.addMember({
            ...input,
            joinedAt: this.dependencies.clock.now(),
        }, transaction)
        if (result.outcome === MEMBERSHIP_ADD_OUTCOMES.ADDED) {
            return { member: toMemberDto(result.member), wasAdded: true }
        }
        if (result.outcome === MEMBERSHIP_ADD_OUTCOMES.EXISTING) {
            return { member: toMemberDto(result.member), wasAdded: false }
        }
        if (result.outcome === MEMBERSHIP_ADD_OUTCOMES.LIMIT) {
            throw new ConflictException(ERROR_CODES.GROUP_LIMIT, MEMBERSHIP_MESSAGES.MEMBER_LIMIT)
        }
        if (result.outcome === MEMBERSHIP_ADD_OUTCOMES.MISSING) {
            throw new NotFoundException(MEMBERSHIP_MESSAGES.NOT_FOUND)
        }
        throw new ConflictException(ERROR_CODES.CONFLICT, MEMBERSHIP_MESSAGES.MEMBERSHIP_CHANGED)
    }

    /** Change a current member's role after rechecking actor and target permissions in-transaction. */
    async changeRole(input: ChangeRoleInput): Promise<MemberDto> {
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const group = await this.getGroup(input.conversationId, transaction)
            const actor = this.getMember(group, input.actorId)
            const target = this.getMember(group, input.targetUserId)
            this.assertCanChangeRole(actor.role, target, input)
            const updatedMember = await this.dependencies.repository.changeRole({
                ...input,
                actorRole: actor.role,
                targetRole: target.role,
            }, transaction)
            if (!updatedMember) throw new ConflictException(ERROR_CODES.CONFLICT, MEMBERSHIP_MESSAGES.MEMBERSHIP_CHANGED)
            return toMemberDto(updatedMember)
        })
    }

    /** Remove a non-owner member after validating current group roles transactionally. */
    async remove(input: RemoveMemberInput): Promise<void> {
        await this.dependencies.transactionRunner.run(async (transaction) => {
            const group = await this.getGroup(input.conversationId, transaction)
            const actor = this.getMember(group, input.actorId)
            const target = this.getMember(group, input.targetUserId)
            this.assertCanRemove(actor.role, target)
            const removed = await this.dependencies.repository.removeMember({
                ...input,
                actorRole: actor.role,
                targetRole: target.role,
            }, transaction)
            if (!removed) throw new ConflictException(ERROR_CODES.CONFLICT, MEMBERSHIP_MESSAGES.MEMBERSHIP_CHANGED)
        })
    }

    /** Transfer group ownership and participant roles in one transaction. */
    async transferOwner(input: TransferOwnerInput): Promise<void> {
        await this.dependencies.transactionRunner.run(async (transaction) => {
            const group = await this.getGroup(input.conversationId, transaction)
            const actor = this.getMember(group, input.actorId)
            const target = this.getMember(group, input.newOwnerId)
            if (actor.role !== ROLE.OWNER || !group.ownerId.equals(input.actorId) || target.role === ROLE.OWNER) {
                this.throwInsufficientRole()
            }
            const transferred = await this.dependencies.repository.transferOwner({
                ...input,
                newOwnerRole: target.role,
            }, transaction)
            if (!transferred) {
                throw new ConflictException(ERROR_CODES.CONFLICT, MEMBERSHIP_MESSAGES.OWNER_TRANSFER_CONFLICT)
            }
        })
    }

    private async getGroup(conversationId: ObjectId, transaction?: TransactionContext): Promise<MembershipGroupRecord> {
        const group = await this.dependencies.repository.findGroup(conversationId, transaction)
        if (!group) throw new NotFoundException(MEMBERSHIP_MESSAGES.NOT_FOUND)
        return group
    }

    private getMember(group: MembershipGroupRecord, userId: ObjectId): MembershipMemberRecord {
        const member = group.members.find(({ userId: memberId }) => memberId.equals(userId))
        if (!member) throw new NotFoundException(MEMBERSHIP_MESSAGES.NOT_FOUND)
        return member
    }

    private assertCanChangeRole(actorRole: GroupMemberRole, target: MembershipMemberRecord, input: ChangeRoleInput): void {
        if (input.actorId.equals(input.targetUserId) || target.role === ROLE.OWNER) this.throwInsufficientRole()
        if (actorRole !== ROLE.OWNER && actorRole !== ROLE.ADMIN) this.throwInsufficientRole()
        if (actorRole === ROLE.ADMIN && (target.role !== ROLE.MEMBER || input.role !== ROLE.MEMBER)) {
            this.throwInsufficientRole()
        }
        if (input.role === ROLE.OWNER) {
            throw new ValidationException(MEMBERSHIP_MESSAGES.INVALID_ROLE)
        }
        if (input.role === target.role) throw new ValidationException(MEMBERSHIP_MESSAGES.ROLE_UNCHANGED)
    }

    private assertCanRemove(actorRole: GroupMemberRole, target: MembershipMemberRecord): void {
        if (target.role === ROLE.OWNER) this.throwInsufficientRole()
        if (actorRole !== ROLE.OWNER && actorRole !== ROLE.ADMIN) this.throwInsufficientRole()
        if (actorRole === ROLE.ADMIN && target.role !== ROLE.MEMBER) this.throwInsufficientRole()
    }

    private throwInsufficientRole(): never {
        throw new ForbiddenException(MEMBERSHIP_MESSAGES.INSUFFICIENT_ROLE, ERROR_CODES.INSUFFICIENT_ROLE)
    }
}

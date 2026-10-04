import {
    CONVERSATION_STATUS,
    ERROR_CODES,
    ROLE,
    type GroupDto,
} from "@linko/contracts"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { GroupRecord, ObjectId } from "./conversation.types"
import { toGroupDto } from "./conversation.mapper"
import { CONVERSATION_LIFECYCLE_MESSAGES } from "./conversationLifecycle.constants"
import type {
    CloseGroupInput,
    ConversationLifecycleServiceDependencies,
    LeaveGroupInput,
} from "./conversationLifecycle.types"

/** Enforce current-owner closure and membership-safe group departure.
 *
 * Departures and invitation revocations share one transaction so removed users lose group access
 * immediately and an owner-only group cannot remain open to stale invitation links.
 *
 * @layer Service
 */
export class ConversationLifecycleService {
    /** Bind lifecycle persistence, group reads, invitation revocation, and the UTC clock. */
    constructor(private readonly dependencies: ConversationLifecycleServiceDependencies) {}

    /**
     * Mark the authenticated participant as departed while retaining join history.
     *
     * An owner must transfer ownership first when other members remain. The final owner leaving
     * closes the now-empty group and revokes its invitation links in the same transaction.
     *
     * @param input - Group and authenticated participant identifiers.
     * @returns Nothing after the departure transaction commits.
     * @throws {ForbiddenException} When an owner leaves while other participants remain.
     * @throws {NotFoundException} When the group or current membership is missing.
     */
    async leave(input: LeaveGroupInput): Promise<void> {
        await this.dependencies.transactionRunner.run(async (transaction) => {
            const group = await this.getGroup(input.conversationId, transaction)
            const actor = group.participants.find(({ userId }) => userId.equals(input.actorId))
            if (!actor) throw new NotFoundException(CONVERSATION_LIFECYCLE_MESSAGES.NOT_FOUND)

            const otherMembers = group.participants.filter(({ userId }) => !userId.equals(input.actorId))
            const isOwner = group.ownerId.equals(input.actorId) && actor.role === ROLE.OWNER
            if (isOwner && group.status === CONVERSATION_STATUS.ACTIVE && otherMembers.length > 0) {
                throw new ForbiddenException(
                    CONVERSATION_LIFECYCLE_MESSAGES.OWNER_TRANSFER_REQUIRED,
                    ERROR_CODES.OWNER_TRANSFER_REQUIRED,
                )
            }

            const closeEmptyGroup = isOwner
                && group.status === CONVERSATION_STATUS.ACTIVE
                && otherMembers.length === 0
            const leftAt = this.dependencies.clock.now()
            const departed = await this.dependencies.repository.leaveParticipant({
                ...input,
                leftAt,
                closeEmptyGroup,
            }, transaction)
            if (!departed) {
                throw new ConflictException(ERROR_CODES.CONFLICT, CONVERSATION_LIFECYCLE_MESSAGES.MEMBERSHIP_CHANGED)
            }
            if (closeEmptyGroup) {
                await this.dependencies.invitationRevoker.revokeUnrevokedInvitations(
                    input.conversationId,
                    leftAt,
                    transaction,
                )
            }
        })
        await this.dependencies.membershipRevoker?.revokeMember(
            input.conversationId.toString(),
            input.actorId.toString(),
        )
    }

    /** Close a group and revoke every invitation link without deleting its history. */
    async close(input: CloseGroupInput): Promise<GroupDto> {
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const group = await this.getGroup(input.conversationId, transaction)
            this.assertOwner(group, input.actorId)

            if (group.status !== CONVERSATION_STATUS.CLOSED) {
                const closed = await this.dependencies.repository.closeGroup(input.conversationId, transaction)
                if (!closed) {
                    throw new ConflictException(ERROR_CODES.CONFLICT, CONVERSATION_LIFECYCLE_MESSAGES.MEMBERSHIP_CHANGED)
                }
            }

            await this.dependencies.invitationRevoker.revokeUnrevokedInvitations(
                input.conversationId,
                this.dependencies.clock.now(),
                transaction,
            )
            const closedGroup = await this.getGroup(input.conversationId, transaction)
            return toGroupDto(closedGroup)
        })
    }

    private async getGroup(conversationId: ObjectId, transaction: TransactionContext): Promise<GroupRecord> {
        const group = await this.dependencies.groupReader.findGroupById(conversationId, transaction)
        if (!group) throw new NotFoundException(CONVERSATION_LIFECYCLE_MESSAGES.NOT_FOUND)
        return group
    }

    private assertOwner(group: GroupRecord, actorId: ObjectId): void {
        if (group.status === CONVERSATION_STATUS.CLOSED && group.ownerId.equals(actorId)) return
        const participant = group.participants.find(({ userId }) => userId.equals(actorId))
        if (!group.ownerId.equals(actorId) || participant?.role !== ROLE.OWNER) {
            throw new ForbiddenException(
                CONVERSATION_LIFECYCLE_MESSAGES.INSUFFICIENT_ROLE,
                ERROR_CODES.INSUFFICIENT_ROLE,
            )
        }
    }
}

import { createHash, randomBytes } from "node:crypto"
import {
    ERROR_CODES,
    INVITATION_LINK_PATH,
    INVITATION_LIMITS,
    ROLE,
    type InvitationPreviewDto,
} from "@linko/contracts"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { InvitationUnavailableException } from "./InvitationUnavailableException"
import { INVITATION_MESSAGES } from "./invitation.constants"
import { toInvitationPreviewDto, toInvitationSummaryDto, toIssuedInvitationDto } from "./invitation.mapper"
import type {
    InvitationGroupAccessRecord,
    InvitationRepository,
    InvitationServiceDependencies,
    InvitationSummaryDto,
    IssuedInvitationDto,
    ManageInvitationsInput,
    IssueInvitationInput,
    ObjectId,
    RevokeInvitationInput,
} from "./invitation.types"

/** Issue, list, and revoke group invitation links under owner/admin access rules.
 *
 * Every group has at most one unrevoked link; token material leaves this service only inside
 * the one-time URL, while persistence receives only its SHA-256 digest.
 *
 * @layer Service
 */
export class InvitationService {
    /** Wire the persistence, transaction, and trusted browser-origin dependencies. */
    constructor(private readonly dependencies: InvitationServiceDependencies) {}

    /** Rotate the active link; a replayed key conflicts without creating another token. */
    async issue(input: IssueInvitationInput): Promise<IssuedInvitationDto> {
        const idempotencyKeyHash = this.createIdempotencyKeyHash(input)
        try {
            const issued = await this.dependencies.transactionRunner.run(async (transaction) => {
                const group = await this.dependencies.repository.findGroupAccess(input.conversationId, transaction)
                this.assertCanManage(group, input.actorId)
                if (await this.dependencies.repository.hasInvitationRequest(idempotencyKeyHash, transaction)) {
                    throw new ConflictException(ERROR_CODES.INVITATION_REQUEST_REPLAYED, INVITATION_MESSAGES.REQUEST_REPLAYED)
                }
                const token = randomBytes(INVITATION_LIMITS.TOKEN_BYTES).toString("base64url")
                const tokenHash = createHash("sha256").update(token).digest("hex")

                await this.dependencies.repository.revokeUnrevokedInvitations(
                    input.conversationId,
                    new Date(),
                    transaction,
                )
                const invitation = await this.dependencies.repository.createInvitation({
                    conversationId: input.conversationId,
                    tokenHash,
                    idempotencyKeyHash,
                }, transaction)
                return { invitation, token }
            })

            const url = new URL(`${INVITATION_LINK_PATH}/${issued.token}`, this.dependencies.clientOrigin).toString()
            return toIssuedInvitationDto(issued.invitation, url)
        } catch (error) {
            if (this.isDuplicateKeyError(error)) {
                if (await this.dependencies.repository.hasInvitationRequest(idempotencyKeyHash)) {
                    throw new ConflictException(ERROR_CODES.INVITATION_REQUEST_REPLAYED, INVITATION_MESSAGES.REQUEST_REPLAYED)
                }
                throw new ConflictException(ERROR_CODES.CONFLICT, INVITATION_MESSAGES.ACTIVE_CONFLICT)
            }
            throw error
        }
    }

    /** List a manager's invitation metadata without disclosing URLs or token hashes. */
    async list(input: ManageInvitationsInput): Promise<InvitationSummaryDto[]> {
        const group = await this.dependencies.repository.findGroupAccess(input.conversationId)
        this.assertCanManage(group, input.actorId)
        const invitations = await this.dependencies.repository.listInvitations(input.conversationId)
        return invitations.map(toInvitationSummaryDto)
    }

    /** Return limited public group details for a valid, unexpired invitation token. */
    async preview(rawToken: string): Promise<InvitationPreviewDto> {
        const tokenHash = createHash("sha256").update(rawToken).digest("hex")
        const invitation = await this.dependencies.repository.findInvitationByTokenHash(tokenHash)
        if (!invitation || !this.isInvitationAvailable(invitation)) {
            throw new InvitationUnavailableException()
        }

        const group = await this.dependencies.repository.findPublicGroupPreview(invitation.conversationId)
        if (!group) throw new InvitationUnavailableException()
        return toInvitationPreviewDto(group, invitation.expiresAt)
    }

    /** Revoke one link immediately while retaining its audit record. */
    async revoke(input: RevokeInvitationInput): Promise<void> {
        await this.dependencies.transactionRunner.run(async (transaction) => {
            const group = await this.dependencies.repository.findGroupAccess(input.conversationId, transaction)
            this.assertCanManage(group, input.actorId)

            const invitation = await this.dependencies.repository.findInvitation(
                input.invitationId,
                input.conversationId,
                transaction,
            )
            if (!invitation) throw new NotFoundException(INVITATION_MESSAGES.NOT_FOUND)
            if (invitation.revokedAt) return

            await this.dependencies.repository.revokeInvitation(
                input.invitationId,
                input.conversationId,
                new Date(),
                transaction,
            )
        })
    }

    private assertCanManage(group: InvitationGroupAccessRecord | null, actorId: ObjectId): void {
        if (!group) throw new NotFoundException(INVITATION_MESSAGES.GROUP_NOT_FOUND)

        const participant = group.participants.find(({ userId }) => userId.toString() === actorId.toString())
        if (!participant || (participant.role !== ROLE.OWNER && participant.role !== ROLE.ADMIN)) {
            throw new ForbiddenException(INVITATION_MESSAGES.FORBIDDEN)
        }
    }

    private isDuplicateKeyError(error: unknown): boolean {
        return typeof error === "object" && error !== null && "code" in error && error.code === 11000
    }

    private isInvitationAvailable(invitation: {
        readonly expiresAt: Date
        readonly maxUses: number
        readonly useCount: number
        readonly revokedAt: Date | null
    }): boolean {
        return invitation.revokedAt === null &&
            invitation.expiresAt.getTime() > Date.now() &&
            invitation.useCount < invitation.maxUses
    }

    /** Hash a retry key with its actor and group so callers cannot collide across scopes. */
    private createIdempotencyKeyHash(input: IssueInvitationInput): string {
        return createHash("sha256")
            .update(JSON.stringify([
                input.actorId.toString(),
                input.conversationId.toString(),
                input.idempotencyKey,
            ]))
            .digest("hex")
    }
}

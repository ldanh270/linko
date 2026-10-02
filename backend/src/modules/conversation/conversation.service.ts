import {
    ERROR_CODES,
    CONVERSATION_STATUS,
    GROUP_FIELDS,
    GROUP_LIMITS,
    ROLE,
    type GroupDto,
} from "@linko/contracts"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { CONVERSATION_OPERATION_FIELDS, GROUP_MESSAGES } from "./conversation.constants"
import { toGroupDto } from "./conversation.mapper"
import type {
    ConversationServiceDependencies,
    CreateGroupInput,
    GroupAvatarRecord,
    GroupRecord,
    GroupSlotReservation,
    ObjectId,
    UpdateGroupInput,
    UpdateGroupRecord,
} from "./conversation.types"

/** Enforce private group creation, membership limits, and owner/admin edits.
 *
 * The repository owns persistence, while injected storage allows failed MongoDB writes to
 * compensate for the public avatar object uploaded before the transaction.
 *
 * @layer Service
 */
export class ConversationService {
    /** Bind group persistence, transaction, and public avatar collaborators. */
    constructor(private readonly dependencies: ConversationServiceDependencies) {}

    /**
     * Create a private group whose initial participant is its owner.
     *
     * Avatar uploads are compensated if the MongoDB transaction cannot commit.
     *
     * @param input - Authenticated owner, validated metadata, and optional avatar bytes.
     * @returns The safe public DTO for the newly created group.
     * @throws {ValidationException} When the group name or description is invalid.
     * @throws {ConflictException} When the owner has reached the group limit.
     */
    async createGroup(input: CreateGroupInput): Promise<GroupDto> {
        const name = this.normalizeName(input[GROUP_FIELDS.NAME])
        const description = this.normalizeDescription(input[GROUP_FIELDS.DESCRIPTION])
        const avatarFile = input[GROUP_FIELDS.AVATAR]
        const avatar = avatarFile
            ? await this.dependencies.avatarStorage.upload(input[GROUP_FIELDS.OWNER_ID], avatarFile)
            : null

        try {
            return await this.dependencies.transactionRunner.run(async (transaction) => {
                const reservation = await this.dependencies.repository.reserveGroupSlot(
                    input[GROUP_FIELDS.OWNER_ID],
                    GROUP_LIMITS.MAX_GROUPS_PER_USER,
                    transaction,
                )
                this.assertSlotReserved(reservation)

                const group = await this.dependencies.repository.createGroup({
                    ownerId: input[GROUP_FIELDS.OWNER_ID],
                    name,
                    description,
                    avatar,
                }, transaction)
                return toGroupDto(group)
            })
        } catch (error) {
            if (avatar) return this.removeUploadedAvatarAfterFailure(avatar, error)
            throw error
        }
    }

    /**
     * Update group metadata after confirming the actor is its owner or an admin.
     *
     * @param input - Target group, authenticated actor, and changed metadata or avatar.
     * @returns The updated safe group DTO.
     * @throws {ForbiddenException} When the actor is not an owner or admin.
     * @throws {NotFoundException} When the group no longer exists.
     */
    async updateGroup(input: UpdateGroupInput): Promise<GroupDto> {
        const changes = this.createUpdateRecord(input)
        const existingGroup = await this.getGroup(input[CONVERSATION_OPERATION_FIELDS.CONVERSATION_ID])
        this.assertCanManageGroup(existingGroup, input[CONVERSATION_OPERATION_FIELDS.ACTOR_ID])

        const avatarFile = input[GROUP_FIELDS.AVATAR]
        const newAvatar = avatarFile
            ? await this.dependencies.avatarStorage.upload(existingGroup.ownerId, avatarFile)
            : undefined
        let updatedGroup: GroupRecord
        let replacedAvatar: GroupAvatarRecord | null = null

        try {
            const result = await this.dependencies.transactionRunner.run(async (transaction) => {
                const currentGroup = await this.getGroup(
                    input[CONVERSATION_OPERATION_FIELDS.CONVERSATION_ID],
                    transaction,
                )
                this.assertCanManageGroup(currentGroup, input[CONVERSATION_OPERATION_FIELDS.ACTOR_ID])
                const update = newAvatar ? { ...changes, avatar: newAvatar } : changes
                const result = await this.dependencies.repository.updateGroup(
                    input[CONVERSATION_OPERATION_FIELDS.CONVERSATION_ID],
                    update,
                    transaction,
                )
                if (!result) throw new NotFoundException(GROUP_MESSAGES.NOT_FOUND)
                return { group: result, replacedAvatar: currentGroup.avatar }
            })
            updatedGroup = result.group
            replacedAvatar = result.replacedAvatar
        } catch (error) {
            if (newAvatar) return this.removeUploadedAvatarAfterFailure(newAvatar, error)
            throw error
        }

        if (newAvatar && replacedAvatar) {
            try {
                await this.dependencies.avatarStorage.delete(replacedAvatar)
            } catch (error) {
                this.dependencies.avatarCleanupFailureRecorder.recordFailure(
                    replacedAvatar,
                    input[CONVERSATION_OPERATION_FIELDS.CONVERSATION_ID],
                    error,
                    input[CONVERSATION_OPERATION_FIELDS.ACTOR_ID],
                )
            }
        }
        return toGroupDto(updatedGroup)
    }

    private assertSlotReserved(reservation: GroupSlotReservation): void {
        if (reservation === "missing") throw new NotFoundException(GROUP_MESSAGES.OWNER_NOT_FOUND)
        if (reservation === "limit") {
            throw new ConflictException(ERROR_CODES.GROUP_LIMIT, GROUP_MESSAGES.GROUP_LIMIT)
        }
    }

    private async getGroup(conversationId: ObjectId, transaction?: TransactionContext): Promise<GroupRecord> {
        const group = await this.dependencies.repository.findGroupById(conversationId, transaction)
        if (!group) throw new NotFoundException(GROUP_MESSAGES.NOT_FOUND)
        return group
    }

    private assertCanManageGroup(group: GroupRecord, actorId: ObjectId): void {
        if (group.status !== CONVERSATION_STATUS.ACTIVE) {
            throw new ConflictException(ERROR_CODES.GROUP_CLOSED, GROUP_MESSAGES.CLOSED)
        }
        const participant = group.participants.find(({ userId }) => userId.toString() === actorId.toString())
        if (!participant || (participant.role !== ROLE.OWNER && participant.role !== ROLE.ADMIN)) {
            throw new ForbiddenException(GROUP_MESSAGES.FORBIDDEN)
        }
    }

    private createUpdateRecord(input: UpdateGroupInput): UpdateGroupRecord {
        const changes: {
            name?: string
            description?: string | null
        } = {}
        const name = input[GROUP_FIELDS.NAME]
        const description = input[GROUP_FIELDS.DESCRIPTION]
        if (name !== undefined) {
            changes.name = this.normalizeName(name)
        }
        if (description !== undefined) {
            changes.description = this.normalizeDescription(description)
        }
        if (changes.name === undefined && changes.description === undefined && !input[GROUP_FIELDS.AVATAR]) {
            throw new ValidationException(GROUP_MESSAGES.EMPTY_UPDATE)
        }
        return changes
    }

    private normalizeName(name: string): string {
        const normalizedName = name.trim()
        if (normalizedName.length < GROUP_LIMITS.MIN_NAME_LENGTH || normalizedName.length > GROUP_LIMITS.MAX_NAME_LENGTH) {
            throw new ValidationException(GROUP_MESSAGES.INVALID_NAME)
        }
        return normalizedName
    }

    private normalizeDescription(description: string | undefined): string | null {
        if (description === undefined) return null
        const normalizedDescription = description.trim()
        if (normalizedDescription.length > GROUP_LIMITS.MAX_DESCRIPTION_LENGTH) {
            throw new ValidationException(GROUP_MESSAGES.INVALID_DESCRIPTION)
        }
        return normalizedDescription || null
    }

    private async removeUploadedAvatarAfterFailure(avatar: GroupAvatarRecord, originalError: unknown): Promise<never> {
        try {
            await this.dependencies.avatarStorage.delete(avatar)
        } catch (cleanupError) {
            throw new AggregateError([originalError, cleanupError], GROUP_MESSAGES.AVATAR_CLEANUP_FAILED)
        }
        throw originalError
    }
}

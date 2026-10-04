import {
    CONVERSATION_TYPE,
    ERROR_CODES,
    NOTIFICATION_PREFERENCE_FIELDS,
    type NotificationPreferenceDto,
} from "@linko/contracts"

import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { NOTIFICATION_ERROR_MESSAGES } from "./notification.constants"
import type {
    NotificationPreferenceMemberRecord,
    NotificationPreferenceServiceDependencies,
    ObjectId,
    SetMutedInput,
} from "./notification.types"

/** Read and change one participant's group notification preference.
 *
 * Unread counters remain owned by the message repository. Legacy active `mutedUntil` values are
 * honored until the backfill is applied and old clients have been retired.
 *
 * @layer Service
 */
export class NotificationPreferenceService {
    /** Inject preference persistence, transaction, and clock ports. */
    constructor(private readonly dependencies: NotificationPreferenceServiceDependencies) {}

    /** Set the current participant's group preference and clear its legacy expiry.
     *
     * @param input - Authenticated participant, conversation, and requested mute state.
     * @returns The safe preference DTO after persistence.
     * @throws {NotFoundException} When the conversation or active membership is absent.
     * @throws {ForbiddenException} When a direct conversation is used for mutation.
     */
    async setMuted(input: SetMutedInput): Promise<NotificationPreferenceDto> {
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const member = await this.requireCurrentMember(input.conversationId, input.userId, transaction)
            if (member.conversationType !== CONVERSATION_TYPE.GROUP) {
                throw new ForbiddenException(NOTIFICATION_ERROR_MESSAGES.GROUP_ONLY, ERROR_CODES.FORBIDDEN)
            }

            const updated = await this.dependencies.repository.setMuted(
                input.conversationId,
                input.userId,
                input.isMuted,
                transaction,
            )
            if (!updated) throw new NotFoundException(NOTIFICATION_ERROR_MESSAGES.NOT_FOUND)
            return toPreferenceDto(input.conversationId, updated, this.dependencies.clock.now())
        })
    }

    /** Return the authenticated participant's current value, including an active legacy expiry.
     *
     * Direct conversations always report their default preference; only groups can be changed.
     *
     * @param userId - MongoDB identifier of the requesting participant.
     * @param conversationId - MongoDB identifier of the conversation.
     * @returns The safe preference DTO.
     * @throws {NotFoundException} When the conversation or active membership is absent.
     */
    async get(userId: ObjectId, conversationId: ObjectId): Promise<NotificationPreferenceDto> {
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const member = await this.requireCurrentMember(conversationId, userId, transaction)
            return toPreferenceDto(conversationId, member, this.dependencies.clock.now())
        })
    }

    private async requireCurrentMember(
        conversationId: ObjectId,
        userId: ObjectId,
        transaction: TransactionContext,
    ): Promise<NotificationPreferenceMemberRecord> {
        const member = await this.dependencies.repository.findCurrentMember(conversationId, userId, transaction)
        if (!member) throw new NotFoundException(NOTIFICATION_ERROR_MESSAGES.NOT_FOUND)
        return member
    }
}

function toPreferenceDto(
    conversationId: ObjectId,
    member: NotificationPreferenceMemberRecord,
    now: Date,
): NotificationPreferenceDto {
    const isMuted = member.isMuted === true || (member.mutedUntil !== null && member.mutedUntil > now)
    return {
        [NOTIFICATION_PREFERENCE_FIELDS.CONVERSATION_ID]: conversationId.toString(),
        [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: isMuted,
    }
}

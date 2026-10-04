import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    ROLE,
    type PinnedMessageDto,
} from "@linko/contracts"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { GROUP_MESSAGES } from "../conversation/conversation.constants"
import { toMessageDto } from "../message/message.mapper"
import { PIN_ERROR_MESSAGES } from "./pin.constants"
import type {
    CurrentPinMemberConversation,
    PinMessageInput,
    PinServiceDependencies,
    ObjectId,
} from "./pin.types"

/** Enforce group pin permissions, capacity, idempotency, and per-viewer visibility.
 *
 * @layer Service
 */
export class PinService {
    /** Bind pin persistence and transactional snapshot access. */
    constructor(private readonly dependencies: PinServiceDependencies) {}

    /** Pin one visible group message after rechecking owner/admin access in a transaction. */
    async pin(input: PinMessageInput): Promise<PinnedMessageDto[]> {
        return this.dependencies.transactionRunner.run((transaction) => this.pinInTransaction(input, transaction))
    }

    /** Remove one group pin idempotently while retaining the three-pin bound. */
    async unpin(input: PinMessageInput): Promise<PinnedMessageDto[]> {
        return this.dependencies.transactionRunner.run(async (transaction) => {
            await this.requireManager(input.conversationId, input.actorId, transaction)
            await this.dependencies.repository.removePin(input, transaction)
            return this.getVisiblePins(input.conversationId, input.actorId, transaction)
        })
    }

    /** List ordered pins visible to the current group member. */
    async list(conversationId: ObjectId, viewerId: ObjectId): Promise<PinnedMessageDto[]> {
        return this.dependencies.transactionRunner.run(async (transaction) => {
            await this.requireMember(conversationId, viewerId, transaction)
            return this.getVisiblePins(conversationId, viewerId, transaction)
        })
    }

    private async pinInTransaction(input: PinMessageInput, transaction: TransactionContext): Promise<PinnedMessageDto[]> {
        const conversation = await this.requireManager(input.conversationId, input.actorId, transaction)
        if (conversation.status === CONVERSATION_STATUS.CLOSED) {
            throw new ConflictException(ERROR_CODES.GROUP_CLOSED, GROUP_MESSAGES.CLOSED)
        }
        const member = conversation.member
        const message = await this.dependencies.repository.findVisibleMessage(
            input.conversationId,
            input.messageId,
            input.actorId,
            member.joinedAt,
            transaction,
        )
        if (!message) throw new NotFoundException(PIN_ERROR_MESSAGES.MESSAGE_NOT_VISIBLE)
        if (!conversation.pinnedMessageIds.some((messageId) => messageId.equals(input.messageId))) {
            const added = await this.dependencies.repository.addPin(input, transaction)
            if (!added) {
                throw new ConflictException(ERROR_CODES.PIN_LIMIT, PIN_ERROR_MESSAGES.PIN_LIMIT)
            }
        }
        return this.getVisiblePins(input.conversationId, input.actorId, transaction)
    }

    private async getVisiblePins(
        conversationId: ObjectId,
        viewerId: ObjectId,
        transaction: TransactionContext,
    ): Promise<PinnedMessageDto[]> {
        const conversation = await this.requireMember(conversationId, viewerId, transaction)
        const member = conversation.member
        if (!member) return []
        const messages = await this.dependencies.repository.listVisiblePins({
            conversationId,
            viewerId,
            joinedAt: member.joinedAt,
            pinnedMessageIds: conversation.pinnedMessageIds,
        }, transaction)
        return messages.map(toMessageDto)
    }

    private async requireMember(
        conversationId: ObjectId,
        viewerId: ObjectId,
        transaction: TransactionContext,
    ): Promise<CurrentPinMemberConversation> {
        const conversation = await this.dependencies.repository.findConversation(conversationId, viewerId, transaction)
        if (!conversation) throw new NotFoundException(PIN_ERROR_MESSAGES.GROUP_NOT_FOUND)
        if (conversation.type !== CONVERSATION_TYPE.GROUP) {
            throw new ForbiddenException(PIN_ERROR_MESSAGES.GROUP_ONLY)
        }
        const member = conversation.member
        if (!member) throw new ForbiddenException(PIN_ERROR_MESSAGES.GROUP_ONLY)
        return { ...conversation, member }
    }

    private async requireManager(
        conversationId: ObjectId,
        actorId: ObjectId,
        transaction: TransactionContext,
    ): Promise<CurrentPinMemberConversation> {
        const conversation = await this.requireMember(conversationId, actorId, transaction)
        if (conversation.member?.role !== ROLE.OWNER && conversation.member?.role !== ROLE.ADMIN) {
            throw new ForbiddenException(PIN_ERROR_MESSAGES.INSUFFICIENT_ROLE, ERROR_CODES.INSUFFICIENT_ROLE)
        }
        return conversation
    }
}

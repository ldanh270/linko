import { ERROR_CODES, type ReadStateDto } from "@linko/contracts"

import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { ValidationException } from "../../shared/errors/ValidationException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { READ_ERROR_MESSAGES } from "./read.constants"
import { toReadStateDto } from "./read.mapper"
import type {
    MarkReadInput,
    ReadCursor,
    ReadParticipantRecord,
    ReadStateServiceDependencies,
} from "./read.types"

/** Advance participant cursors monotonically and count only visible incoming messages.
 *
 * @layer Service
 */
export class ReadStateService {
    /** Inject read persistence, transaction, and clock ports. */
    constructor(private readonly dependencies: ReadStateServiceDependencies) {}

    /** Mark a visible message as read without allowing an older tab to move the cursor back.
     *
     * @param input - Current reader, conversation, and the last visible message.
     * @returns The persisted read cursor and remaining incoming unread count.
     * @throws {ForbiddenException} When the actor is not a current participant.
     * @throws {ValidationException} When the target message is absent, future, or before joinedAt.
     */
    async markRead(input: MarkReadInput): Promise<ReadStateDto> {
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const member = await this.requireCurrentMember(input.conversationId, input.userId, transaction)
            const now = this.dependencies.clock.now()
            const target = await this.dependencies.repository.findVisibleMessage(
                input.conversationId,
                input.lastVisibleMessageId,
                member.joinedAt,
                now,
                transaction,
            )
            if (!target) throw new ValidationException(READ_ERROR_MESSAGES.MESSAGE_NOT_VISIBLE)

            const targetCursor: ReadCursor = { createdAt: target.createdAt, messageId: target.id }
            const cursor = selectNewestCursor(cursorFromMember(member), targetCursor)
            const unreadCount = await this.dependencies.repository.countUnread({
                conversationId: input.conversationId,
                userId: input.userId,
                joinedAt: member.joinedAt,
                cursor,
                at: now,
            }, transaction)
            const state = await this.dependencies.repository.updateReadState({
                conversationId: input.conversationId,
                userId: input.userId,
                lastReadAt: cursor.createdAt,
                lastReadMessageId: cursor.messageId,
                unreadCount,
            }, transaction)
            if (!state) throw new ForbiddenException(READ_ERROR_MESSAGES.NOT_A_MEMBER, ERROR_CODES.FORBIDDEN)
            return toReadStateDto(state)
        })
    }

    /** Count incoming messages after the current participant's monotonic cursor.
     *
     * @param userId - MongoDB identifier of the authenticated reader.
     * @param conversationId - MongoDB identifier of the conversation.
     * @returns The number of other participants' currently visible unread messages.
     * @throws {ForbiddenException} When the actor is not a current participant.
     */
    async getUnread(
        userId: MarkReadInput["userId"],
        conversationId: MarkReadInput["conversationId"],
    ): Promise<number> {
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const member = await this.requireCurrentMember(conversationId, userId, transaction)
            return this.dependencies.repository.countUnread({
                conversationId,
                userId,
                joinedAt: member.joinedAt,
                cursor: cursorFromMember(member),
                at: this.dependencies.clock.now(),
            }, transaction)
        })
    }

    private async requireCurrentMember(
        conversationId: MarkReadInput["conversationId"],
        userId: MarkReadInput["userId"],
        transaction: TransactionContext,
    ): Promise<ReadParticipantRecord> {
        const member = await this.dependencies.repository.findCurrentMember(conversationId, userId, transaction)
        if (!member) throw new ForbiddenException(READ_ERROR_MESSAGES.NOT_A_MEMBER, ERROR_CODES.FORBIDDEN)
        return member
    }
}

function cursorFromMember(member: ReadParticipantRecord): ReadCursor | null {
    return member.lastReadAt && member.lastReadMessageId
        ? { createdAt: member.lastReadAt, messageId: member.lastReadMessageId }
        : null
}

function selectNewestCursor(current: ReadCursor | null, candidate: ReadCursor): ReadCursor {
    if (!current || compareCursor(current, candidate) < 0) return candidate
    return current
}

function compareCursor(first: ReadCursor, second: ReadCursor): number {
    const dateDifference = first.createdAt.getTime() - second.createdAt.getTime()
    if (dateDifference !== 0) return dateDifference
    return first.messageId.toString().localeCompare(second.messageId.toString())
}

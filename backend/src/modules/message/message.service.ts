import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    MESSAGE_LIMITS,
    type CursorPage,
    type MessageDto,
} from "@linko/contracts"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { MESSAGE_CURSOR_ID_PATTERN, MESSAGE_ERROR_MESSAGES } from "./message.constants"
import { MessageDuplicateKeyError } from "./MessageDuplicateKeyError"
import { toMessageDto } from "./message.mapper"
import type {
    ConversationMessageAccessRecord,
    ListMessagesInput,
    MessageCursor,
    MessageRecord,
    MessageServiceDependencies,
    SendMessageInput,
} from "./message.types"

/** Enforce conversation access, idempotent message writes, and history cursors.
 *
 * @layer Service
 */
export class MessageService {
    /** Inject persistence, transaction, and clock ports for message use cases. */
    constructor(private readonly dependencies: MessageServiceDependencies) {}

    /** Store one message and update inbox summaries atomically.
     *
     * Retries with the same sender-scoped client ID return the original DTO.
     *
     * @param input - Authenticated sender, conversation, idempotency key, and content.
     * @returns The persisted safe message DTO.
     * @throws {ForbiddenException} When the sender is not a current participant.
     * @throws {ConflictException} When the group is closed.
     * @throws {ValidationException} When content or the idempotency key is invalid.
     */
    async send(input: SendMessageInput): Promise<MessageDto> {
        const content = validateContent(input.content)
        validateClientMessageId(input.clientMessageId)

        try {
            return await this.dependencies.transactionRunner.run(async (transaction) => {
                const access = await this.requireCurrentMember(input.conversationId, input.senderId, transaction)
                const existing = await this.dependencies.repository.findByClientMessageId(
                    input.conversationId,
                    input.senderId,
                    input.clientMessageId,
                    transaction,
                )
                if (existing) return toMessageDto(existing)

                await this.assertCanSend(access, input.senderId, transaction)
                const messageContext = await this.dependencies.replyMentionValidator.validate({
                    conversationId: input.conversationId,
                    senderId: input.senderId,
                    replyToId: input.replyToId ?? null,
                    mentionIds: input.mentionIds ?? [],
                    transaction,
                })
                const now = this.dependencies.clock.now()
                const message = await this.dependencies.repository.createMessage({
                    conversationId: input.conversationId,
                    senderId: input.senderId,
                    clientMessageId: input.clientMessageId,
                    content,
                    replyToId: messageContext.replyToId,
                    mentions: messageContext.mentions,
                    createdAt: now,
                }, transaction)
                await this.dependencies.repository.updateConversationAfterMessage(message, transaction)
                return toMessageDto(message)
            })
        } catch (error) {
            if (!(error instanceof MessageDuplicateKeyError)) throw error
            const access = await this.requireCurrentMember(input.conversationId, input.senderId)
            const existing = await this.dependencies.repository.findByClientMessageId(
                input.conversationId,
                input.senderId,
                input.clientMessageId,
            )
            if (existing) return toMessageDto(existing)
            await this.assertCanSend(access, input.senderId)
            throw error
        }
    }

    /** Read a chronological message page visible since the current membership began.
     *
     * @param input - Authenticated reader, conversation, optional cursor, and page limit.
     * @returns Visible message DTOs and an opaque cursor for older history.
     * @throws {ForbiddenException} When the reader is not a current participant.
     * @throws {ValidationException} When the cursor or page limit is invalid.
     */
    async list(input: ListMessagesInput): Promise<CursorPage<MessageDto>> {
        validatePageLimit(input.limit)
        const cursor = input.cursor ? decodeCursor(input.cursor) : null
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const access = await this.requireCurrentMember(input.conversationId, input.userId, transaction)
            const page = await this.dependencies.repository.listMessages({
                conversationId: input.conversationId,
                joinedAt: access.joinedAt,
                cursor,
                limit: input.limit,
            }, transaction)
            const oldestMessage = page.items[0]
            return {
                items: page.items.map(toMessageDto),
                nextCursor: page.hasMore && oldestMessage ? encodeCursor(oldestMessage) : null,
            }
        })
    }

    private async requireCurrentMember(
        conversationId: SendMessageInput["conversationId"],
        userId: SendMessageInput["senderId"],
        transaction?: TransactionContext,
    ): Promise<ConversationMessageAccessRecord & { readonly joinedAt: Date }> {
        const access = await this.dependencies.repository.findConversationAccess(conversationId, userId, transaction)
        if (!access) throw new NotFoundException(MESSAGE_ERROR_MESSAGES.CONVERSATION_NOT_FOUND)
        if (!access.joinedAt) {
            throw new ForbiddenException(MESSAGE_ERROR_MESSAGES.NOT_A_MEMBER, ERROR_CODES.FORBIDDEN)
        }
        return { ...access, joinedAt: access.joinedAt }
    }

    private async assertCanSend(
        access: ConversationMessageAccessRecord,
        senderId: SendMessageInput["senderId"],
        transaction?: TransactionContext,
    ): Promise<void> {
        if (access.type === CONVERSATION_TYPE.GROUP && access.status === CONVERSATION_STATUS.CLOSED) {
            throw new ConflictException(ERROR_CODES.GROUP_CLOSED, MESSAGE_ERROR_MESSAGES.GROUP_CLOSED)
        }
        if (access.type !== CONVERSATION_TYPE.DIRECT) return

        const peerId = access.participantIds.find((participantId) => !participantId.equals(senderId))
        if (!peerId || !(await this.dependencies.repository.areFriends(senderId, peerId, transaction))) {
            throw new ForbiddenException(MESSAGE_ERROR_MESSAGES.FRIENDSHIP_REQUIRED, ERROR_CODES.FRIENDSHIP_REQUIRED)
        }
    }
}

function validateContent(content: string): string {
    if (!content.trim()) throw new ValidationException(MESSAGE_ERROR_MESSAGES.EMPTY_CONTENT)
    if (content.length > MESSAGE_LIMITS.MAX_CONTENT_LENGTH) {
        throw new ValidationException(MESSAGE_ERROR_MESSAGES.CONTENT_TOO_LONG)
    }
    return content.trim()
}

function validateClientMessageId(clientMessageId: string): void {
    if (!clientMessageId.trim() || clientMessageId.length > MESSAGE_LIMITS.CLIENT_MESSAGE_ID_LENGTH) {
        throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_CLIENT_MESSAGE_ID)
    }
}

function validatePageLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > MESSAGE_LIMITS.MAX_PAGE_SIZE) {
        throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_PAGE_LIMIT)
    }
}

function encodeCursor(message: MessageRecord): string {
    const cursor: MessageCursor = { createdAt: message.createdAt, id: message.id.toString() }
    return Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id })).toString("base64url")
}

function decodeCursor(value: string): MessageCursor {
    if (value.length > MESSAGE_LIMITS.MAX_CURSOR_LENGTH) {
        throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_CURSOR)
    }
    try {
        const decoded: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"))
        if (!isMessageCursor(decoded)) throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_CURSOR)
        const createdAt = new Date(decoded.createdAt)
        if (Number.isNaN(createdAt.getTime())) throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_CURSOR)
        return { createdAt, id: decoded.id }
    } catch (error) {
        if (error instanceof ValidationException) throw error
        throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_CURSOR)
    }
}

function isMessageCursor(value: unknown): value is { readonly createdAt: string; readonly id: string } {
    return typeof value === "object"
        && value !== null
        && "createdAt" in value
        && typeof value.createdAt === "string"
        && "id" in value
        && typeof value.id === "string"
        && MESSAGE_CURSOR_ID_PATTERN.test(value.id)
}

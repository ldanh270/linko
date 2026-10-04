import {
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    ERROR_CODES,
    MESSAGE_LIMITS,
    type CursorPage,
    type MessageDto,
} from "@linko/contracts"
import mongoose from "mongoose"

import { ConflictException } from "../../shared/errors/ConflictException"
import { ForbiddenException } from "../../shared/errors/ForbiddenException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { StoredAttachment } from "../attachment/attachment.types"
import { MESSAGE_CURSOR_ID_PATTERN, MESSAGE_ERROR_MESSAGES } from "./message.constants"
import { MessageDuplicateKeyError } from "./MessageDuplicateKeyError"
import { toMessageDto } from "./message.mapper"
import type {
    ConversationMessageAccessRecord,
    ListMessagesInput,
    MessageCursor,
    MessageRecord,
    MessageServiceDependencies,
    ResolvedSendMessageInput,
    SendMessageInput,
} from "./message.types"
import type { ValidatedMessageContext } from "./replyMention.types"

type SendValidation = {
    readonly existing: MessageRecord | null
    readonly messageContext: ValidatedMessageContext | null
}

type MessageWriteResult = {
    readonly message: MessageRecord
    readonly created: boolean
}

/** Enforce conversation access, idempotent message writes, and history cursors.
 *
 * @layer Service
 */
export class MessageService {
    /** Inject persistence, transaction, and clock ports for message use cases. */
    constructor(private readonly dependencies: MessageServiceDependencies) {}

    /** Store one message and update inbox summaries atomically.
     *
     * Retries with the same sender-scoped client ID return the original DTO. Private files are
     * uploaded only after a membership preflight and compensated if the message transaction fails.
     *
     * @param input - Authenticated sender, conversation, idempotency key, text, and optional files.
     * @returns The persisted safe message DTO.
     * @throws {ForbiddenException} When the sender is not a current participant.
     * @throws {ConflictException} When the group is closed.
     * @throws {ValidationException} When content or the idempotency key is invalid.
     */
    async send(input: SendMessageInput): Promise<MessageDto> {
        const attachments = input.attachments ?? []
        const content = validateContent(input.content, attachments.length > 0)
        validateClientMessageId(input.clientMessageId)
        const resolvedInput = await this.resolveDestination(input)

        return attachments.length === 0
            ? this.sendWithoutAttachments(resolvedInput, content)
            : this.sendWithAttachments(resolvedInput, content, attachments)
    }

    private async sendWithoutAttachments(input: ResolvedSendMessageInput, content: string | null): Promise<MessageDto> {
        let result: MessageWriteResult
        try {
            result = await this.dependencies.transactionRunner.run((transaction) =>
                this.persistMessage(input, content, [], transaction),
            )
        } catch (error) {
            return this.recoverDuplicateMessage(input, error)
        }
        return this.toPublishedMessage(result)
    }

    private async sendWithAttachments(
        input: ResolvedSendMessageInput,
        content: string | null,
        files: NonNullable<ResolvedSendMessageInput["attachments"]>,
    ): Promise<MessageDto> {
        const preflight = await this.dependencies.transactionRunner.run((transaction) =>
            this.validateSend(input, transaction),
        )
        if (preflight.existing) return toMessageDto(preflight.existing)

        const attachments = await this.dependencies.attachmentService.store({ userId: input.senderId, files })
        let result: MessageWriteResult
        try {
            result = await this.dependencies.transactionRunner.run((transaction) =>
                this.persistMessage(input, content, attachments, transaction),
            )
        } catch (error) {
            await this.dependencies.attachmentService.cleanup(attachments)
            return this.recoverDuplicateMessage(input, error)
        }
        if (!result.created) await this.dependencies.attachmentService.cleanup(attachments)
        return this.toPublishedMessage(result)
    }

    private async toPublishedMessage(result: MessageWriteResult): Promise<MessageDto> {
        const message = toMessageDto(result.message)
        if (result.created) await this.dependencies.messagePublisher?.publishMessage(message)
        return message
    }

    private async persistMessage(
        input: ResolvedSendMessageInput,
        content: string | null,
        attachments: readonly StoredAttachment[],
        transaction: TransactionContext,
    ): Promise<MessageWriteResult> {
        const validation = await this.validateSend(input, transaction)
        if (validation.existing) return { message: validation.existing, created: false }
        const messageContext = validation.messageContext
        if (!messageContext) throw new Error(MESSAGE_ERROR_MESSAGES.INVALID_RECORD)

        const message = await this.dependencies.repository.createMessage({
            conversationId: input.conversationId,
            senderId: input.senderId,
            clientMessageId: input.clientMessageId,
            content,
            replyToId: messageContext.replyToId,
            mentions: messageContext.mentions,
            attachments,
            createdAt: this.dependencies.clock.now(),
        }, transaction)
        await this.dependencies.repository.updateConversationAfterMessage(message, transaction)
        return { message, created: true }
    }

    private async validateSend(input: ResolvedSendMessageInput, transaction: TransactionContext): Promise<SendValidation> {
        const access = await this.requireCurrentMember(input.conversationId, input.senderId, transaction)
        const existing = await this.dependencies.repository.findByClientMessageId(
            input.conversationId,
            input.senderId,
            input.clientMessageId,
            transaction,
        )
        if (existing) return { existing, messageContext: null }

        await this.assertCanSend(access, input.senderId, transaction)
        const messageContext = await this.dependencies.replyMentionValidator.validate({
            conversationId: input.conversationId,
            senderId: input.senderId,
            replyToId: input.replyToId ?? null,
            mentionIds: input.mentionIds ?? [],
            transaction,
        })
        return { existing: null, messageContext }
    }

    private async recoverDuplicateMessage(input: ResolvedSendMessageInput, error: unknown): Promise<MessageDto> {
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

    /** Read a chronological message page visible since the current membership began.
     *
     * @param input - Authenticated reader, conversation, optional cursor, and page limit.
     * @returns Visible message DTOs and an opaque cursor for older history.
     * @throws {ForbiddenException} When the reader is not a current participant.
     * @throws {ValidationException} When the cursor or page limit is invalid.
     */
    async list(input: ListMessagesInput): Promise<CursorPage<MessageDto>> {
        validatePageLimit(input.limit)
        const afterMessageId = input.afterMessageId
            ? new mongoose.Types.ObjectId(decodeMessageId(input.afterMessageId))
            : null
        const cursor = input.cursor ? decodeCursor(input.cursor) : null
        if (afterMessageId && cursor) throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_CURSOR)
        return this.dependencies.transactionRunner.run(async (transaction) => {
            const access = await this.requireCurrentMember(input.conversationId, input.userId, transaction)
            const page = await this.dependencies.repository.listMessages({
                conversationId: input.conversationId,
                joinedAt: access.joinedAt,
                cursor,
                afterMessageId,
                limit: input.limit,
            }, transaction)
            const oldestMessage = page.items[0]
            const newestMessage = page.items.at(-1)
            return {
                items: page.items.map(toMessageDto),
                nextCursor: page.hasMore && afterMessageId && newestMessage
                    ? newestMessage.id.toString()
                    : page.hasMore && oldestMessage
                        ? encodeCursor(oldestMessage)
                        : null,
            }
        })
    }

    private async requireCurrentMember(
        conversationId: ResolvedSendMessageInput["conversationId"],
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

    private async resolveDestination(input: SendMessageInput): Promise<ResolvedSendMessageInput> {
        const hasConversationId = input.conversationId !== undefined
        const hasRecipientId = input.recipientId !== undefined
        if (hasConversationId === hasRecipientId) {
            throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_DESTINATION)
        }
        let conversationId = input.conversationId
        if (input.recipientId) {
            const resolver = this.dependencies.directConversationResolver
            if (!resolver) {
                throw new ForbiddenException(MESSAGE_ERROR_MESSAGES.FRIENDSHIP_REQUIRED, ERROR_CODES.NOT_FRIENDS)
            }
            conversationId = await resolver.getOrCreate(input.senderId, input.recipientId)
        }
        if (!conversationId) throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_DESTINATION)
        const { conversationId: _originalConversationId, recipientId: _recipientId, ...messageFields } = input
        return { ...messageFields, conversationId }
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

function validateContent(content: string | undefined, hasAttachments: boolean): string | null {
    const normalizedContent = content?.trim() ?? ""
    if (!normalizedContent && !hasAttachments) throw new ValidationException(MESSAGE_ERROR_MESSAGES.EMPTY_CONTENT)
    if (normalizedContent.length > MESSAGE_LIMITS.MAX_CONTENT_LENGTH) {
        throw new ValidationException(MESSAGE_ERROR_MESSAGES.CONTENT_TOO_LONG)
    }
    return normalizedContent || null
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

function decodeMessageId(value: string): MessageCursor["id"] {
    if (value.length > MESSAGE_LIMITS.MAX_CURSOR_LENGTH || !MESSAGE_CURSOR_ID_PATTERN.test(value)) {
        throw new ValidationException(MESSAGE_ERROR_MESSAGES.INVALID_CURSOR)
    }
    return value
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

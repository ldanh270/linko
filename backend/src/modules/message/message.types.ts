import type { ConversationStatus, ConversationType, MessageDto } from "@linko/contracts"
import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** MongoDB ObjectId used by persistence-facing message operations. */
export type ObjectId = Types.ObjectId

/** Persisted message fields required by service rules and response mapping. */
export interface MessageRecord {
    readonly id: ObjectId
    readonly conversationId: ObjectId
    readonly senderId: ObjectId
    readonly clientMessageId: string
    readonly content: string | null
    readonly createdAt: Date
    readonly updatedAt: Date
}

/** Current conversation context required to enforce membership and history limits. */
export interface ConversationMessageAccessRecord {
    readonly conversationId: ObjectId
    readonly type: ConversationType
    readonly status: ConversationStatus
    readonly participantIds: readonly ObjectId[]
    readonly joinedAt: Date | null
}

/** Validated content and idempotency data ready for persistence. */
export interface CreateMessageRecord {
    readonly conversationId: ObjectId
    readonly senderId: ObjectId
    readonly clientMessageId: string
    readonly content: string
    readonly createdAt: Date
}

/** Cursor ordering boundary for the next page of older messages. */
export interface MessageCursor {
    readonly createdAt: Date
    readonly id: string
}

/** Message query arguments after service membership authorization. */
export interface ListMessageRecordsInput {
    readonly conversationId: ObjectId
    readonly joinedAt: Date
    readonly cursor: MessageCursor | null
    readonly limit: number
}

/** Result of reading one bounded page from MongoDB. */
export interface ListMessageRecordsResult {
    readonly items: readonly MessageRecord[]
    readonly hasMore: boolean
}

/** Persistence operations needed by message send and history use cases. */
export interface MessageRepository {
    /** Load conversation status and current membership in an optional transaction. */
    findConversationAccess(
        conversationId: ObjectId,
        userId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<ConversationMessageAccessRecord | null>
    /** Check whether a direct-conversation peer remains an active friend. */
    areFriends(userA: ObjectId, userB: ObjectId, transaction?: TransactionContext): Promise<boolean>
    /** Find a prior message for one sender's client idempotency key. */
    findByClientMessageId(
        conversationId: ObjectId,
        senderId: ObjectId,
        clientMessageId: string,
        transaction?: TransactionContext,
    ): Promise<MessageRecord | null>
    /** Insert a message with its client timestamp inside the caller's transaction. */
    createMessage(input: CreateMessageRecord, transaction: TransactionContext): Promise<MessageRecord>
    /** Update last-message and unread summaries in the same transaction as insertion. */
    updateConversationAfterMessage(message: MessageRecord, transaction: TransactionContext): Promise<void>
    /** Read messages newer than the membership boundary and before the supplied cursor. */
    listMessages(input: ListMessageRecordsInput, transaction?: TransactionContext): Promise<ListMessageRecordsResult>
}

/** Execute message writes or bounded reads in a MongoDB transaction. */
export interface MessageTransactionRunner {
    /** Run one message operation with an isolated session. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Provide a stable UTC time source for message records. */
export interface MessageClock {
    /** Return the current UTC instant. */
    now(): Date
}

/** Constructor dependencies for the message domain service. */
export interface MessageServiceDependencies {
    readonly repository: MessageRepository
    readonly transactionRunner: MessageTransactionRunner
    readonly clock: MessageClock
}

/** Authenticated content-only message command. */
export interface SendMessageInput {
    readonly conversationId: ObjectId
    readonly senderId: ObjectId
    readonly clientMessageId: string
    readonly content: string
}

/** Authenticated bounded conversation history query. */
export interface ListMessagesInput {
    readonly conversationId: ObjectId
    readonly userId: ObjectId
    readonly cursor?: string
    readonly limit: number
}

/** Service result shared with its API mapper. */
export type MessageServiceResult = MessageDto

import type { ConversationStatus, ConversationType, PinnedMessageDto, Role } from "@linko/contracts"
import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"
import type { MessageRecord } from "../message/message.types"

/** MongoDB ObjectId used by persistence-facing pin operations. */
export type ObjectId = Types.ObjectId

/** Current viewer's persisted membership data needed for pin authorization. */
export interface PinMemberRecord {
    readonly role: Role
    readonly joinedAt: Date
}

/** Conversation and pin state read without exposing a Mongoose document. */
export interface PinConversationRecord {
    readonly type: ConversationType
    readonly status: ConversationStatus
    readonly pinnedMessageIds: readonly ObjectId[]
    readonly member: PinMemberRecord | null
}

/** Conversation state after the viewer's active membership has been confirmed. */
export type CurrentPinMemberConversation = PinConversationRecord & { readonly member: PinMemberRecord }

/** Input to one atomic prepend that cannot exceed the configured pin count. */
export interface AddPinRecordInput {
    readonly conversationId: ObjectId
    readonly actorId: ObjectId
    readonly messageId: ObjectId
}

/** Query data required to return only pins visible to the current member. */
export interface ListVisiblePinsInput {
    readonly conversationId: ObjectId
    readonly viewerId: ObjectId
    readonly joinedAt: Date
    readonly pinnedMessageIds: readonly ObjectId[]
}

/** Persistence operations used by pin business rules. */
export interface PinRepository {
    /** Load conversation membership and ordered pin identifiers. */
    findConversation(conversationId: ObjectId, viewerId: ObjectId, transaction: TransactionContext): Promise<PinConversationRecord | null>
    /** Read one message only when it belongs to the group and is visible since joinedAt. */
    findVisibleMessage(
        conversationId: ObjectId,
        messageId: ObjectId,
        viewerId: ObjectId,
        joinedAt: Date,
        transaction: TransactionContext,
    ): Promise<MessageRecord | null>
    /** Atomically prepend one pin only while fewer than the maximum are stored. */
    addPin(input: AddPinRecordInput, transaction: TransactionContext): Promise<boolean>
    /** Remove one pin if it exists while the actor remains an owner or admin. */
    removePin(input: AddPinRecordInput, transaction: TransactionContext): Promise<void>
    /** Load existing pin messages in persisted pin order while filtering viewer visibility. */
    listVisiblePins(input: ListVisiblePinsInput, transaction: TransactionContext): Promise<readonly MessageRecord[]>
}

/** Execute pin reads and mutations within one MongoDB snapshot. */
export interface PinTransactionRunner {
    /** Run an operation atomically and return its domain result. */
    run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T>
}

/** Authenticated pin mutation target and conversation identifiers. */
export interface PinMessageInput {
    readonly conversationId: ObjectId
    readonly messageId: ObjectId
    readonly actorId: ObjectId
}

/** Constructor collaborators for pin use cases. */
export interface PinServiceDependencies {
    readonly repository: PinRepository
    readonly transactionRunner: PinTransactionRunner
}

/** Safe ordered public data for visible pinned messages. */
export type { PinnedMessageDto }

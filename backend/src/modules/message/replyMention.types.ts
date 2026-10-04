import type { Types } from "mongoose"

import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** MongoDB ObjectId used by reply and mention persistence operations. */
export type ObjectId = Types.ObjectId

/** Current member visibility boundary and active mention candidates. */
export interface ReplyMentionMemberContext {
    readonly joinedAt: Date
    readonly activeMemberIds: readonly ObjectId[]
}

/** Minimal reply target state needed to enforce history visibility. */
export interface ReplyTargetRecord {
    readonly createdAt: Date
}

/** Input to the reply and mention business-rule validator. */
export interface ReplyMentionInput {
    readonly conversationId: ObjectId
    readonly senderId: ObjectId
    readonly replyToId: ObjectId | null
    readonly mentionIds: readonly ObjectId[]
    readonly transaction?: TransactionContext
}

/** Validated message metadata ready to persist with the message. */
export interface ValidatedMessageContext {
    readonly replyToId: ObjectId | null
    readonly mentions: readonly ObjectId[]
}

/** Persistence operations required to validate reply and mention visibility. */
export interface ReplyMentionRepository {
    /** Load the current sender membership and all active member IDs. */
    findMemberContext(
        conversationId: ObjectId,
        senderId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<ReplyMentionMemberContext | null>
    /** Find a non-deleted, non-hidden reply target from the same conversation. */
    findReplyTarget(
        conversationId: ObjectId,
        replyToId: ObjectId,
        senderId: ObjectId,
        transaction?: TransactionContext,
    ): Promise<ReplyTargetRecord | null>
}

/** Constructor dependencies for reply and mention validation. */
export interface ReplyMentionServiceDependencies {
    readonly repository: ReplyMentionRepository
}

/** Service capability consumed by message writes to validate optional references. */
export interface ReplyMentionValidator {
    /** Validate references in the transaction that stores the message. */
    validate(input: ReplyMentionInput): Promise<ValidatedMessageContext>
}

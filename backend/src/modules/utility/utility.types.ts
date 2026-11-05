import type { ChatMessageKind, ConversationType, MessageDto, UtilityChangedEvent } from "@linko/contracts"
import type { Types } from "mongoose"
import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** An authenticated utility operation resolved by the boundary. */
export interface UtilityActor { readonly conversationId: Types.ObjectId; readonly actorId: Types.ObjectId; readonly messageId?: Types.ObjectId; readonly write?: boolean }
/** Active membership and visible-history boundary for a utility operation. */
export interface UtilityMembership { readonly role: string; readonly joinedAt: Date; readonly type: ConversationType; readonly status: string; readonly memberIds: readonly Types.ObjectId[] }
/** Authorize every resource read/write against current membership and source history. */
export interface UtilityAccessPort { require(input: UtilityActor, transaction?: TransactionContext): Promise<UtilityMembership> }
/** Create a first-class message in the same transaction as its utility resource. */
export interface UtilityMessageInput { readonly conversationId: Types.ObjectId; readonly actorId: Types.ObjectId; readonly clientMessageId: string; readonly kind: ChatMessageKind; readonly resourceId: Types.ObjectId; readonly content: string }
/** Transactional utility messages with idempotent lookup and post-commit publication. */
export interface UtilityTimelinePort {
  create(input: UtilityMessageInput, transaction: TransactionContext): Promise<MessageDto>
  find(input: Pick<UtilityMessageInput, "conversationId" | "actorId" | "clientMessageId">, transaction?: TransactionContext): Promise<MessageDto | null>
  publish(message: MessageDto): Promise<void>
}
/** Inject utility invalidations and private reminder transport at the composition root. */
export interface UtilityNotifier {
  changed(event: UtilityChangedEvent): Promise<void>
  reminder(userId: string, reminderId: string): Promise<void>
}
/** Common infrastructure ports used by independent chat utility features. */
export interface UtilityRuntime {
  readonly access: UtilityAccessPort
  readonly timeline: UtilityTimelinePort
  readonly transactionRunner: { run<T>(operation: (transaction: TransactionContext) => Promise<T>): Promise<T> }
  readonly clock: { now(): Date }
  readonly notifier: UtilityNotifier
  readonly onError: (error: unknown) => void
}

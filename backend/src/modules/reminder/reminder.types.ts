import type { HydratedDocument, Types } from "mongoose"
import type { ReminderJobRecord } from "../../models/ReminderJob"
import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** Internal durable reminder snapshot, never returned as a raw API entity. */
export type ReminderDocument = HydratedDocument<ReminderJobRecord>
/** Fields needed to create or replace one personal scheduling intent. */
export interface ScheduleReminderInput { readonly ownerId: Types.ObjectId; readonly conversationId: Types.ObjectId; readonly messageId: Types.ObjectId; readonly appointmentId: Types.ObjectId | null; readonly appointmentRevision: number | null; readonly clientMessageId: string; readonly title: string; readonly note: string; readonly dueAt: Date }
/** Authorized bounded inbox results with a count independent of the requested page. */
export interface ReminderInboxRecords { readonly items: readonly ReminderDocument[]; readonly nextCursor: string | null; readonly unreadCount: number }
/** Persistence contract for durable jobs, inbox and once-only receipts. */
export interface ReminderRepository {
    find(id: Types.ObjectId, transaction?: TransactionContext): Promise<ReminderDocument | null>
    findByClient(ownerId: Types.ObjectId, clientMessageId: string, transaction?: TransactionContext): Promise<ReminderDocument | null>
    schedule(input: ScheduleReminderInput, transaction: TransactionContext): Promise<ReminderDocument>
    invalidate(appointmentId: Types.ObjectId, transaction: TransactionContext, ownerId?: Types.ObjectId): Promise<void>
    /** Carry unchanged scheduling intents forward without losing overdue work or active leases. */
    rebase(input: { appointmentId: Types.ObjectId; fromRevision: number; toRevision: number }, transaction: TransactionContext): Promise<void>
    list(ownerId: Types.ObjectId): Promise<ReminderDocument[]>
    /** Filter source authorization before keyset pagination and unread counting. */
    inbox(ownerId: Types.ObjectId, cursor?: ReminderDocument): Promise<ReminderInboxRecords>
    /** Mark every currently authorized delivery read across all inbox pages. */
    markAllRead(ownerId: Types.ObjectId, now: Date): Promise<void>
    markRead(ids: readonly Types.ObjectId[], ownerId: Types.ObjectId, now: Date): Promise<void>
    dismiss(id: Types.ObjectId, ownerId: Types.ObjectId): Promise<void>
    edit(input: { id: Types.ObjectId; ownerId: Types.ObjectId; dueAt: Date; note: string }, transaction: TransactionContext): Promise<ReminderDocument | null>
    claim(now: Date, token: string): Promise<ReminderDocument | null>
    complete(job: ReminderDocument, now: Date, transaction: TransactionContext): Promise<boolean>
    cancelClaim(job: ReminderDocument, transaction: TransactionContext): Promise<void>
    retry(job: ReminderDocument, now: Date): Promise<void>
}

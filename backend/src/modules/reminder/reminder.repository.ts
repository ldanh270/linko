import type { Types } from "mongoose"
import { UTILITY_LIMITS } from "@linko/contracts"
import { ReminderJob } from "../../models/ReminderJob"
import { ReminderDelivery } from "../../models/ReminderDelivery"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { SCHEDULING_LIMITS } from "../appointment/appointment.constants"
import { DELIVERY_FIELDS as D, REMINDER_FIELDS as F, REMINDER_STATUS as S } from "./reminder.constants"
import type { ReminderDocument, ReminderRepository, ScheduleReminderInput } from "./reminder.types"

/** Persist reminder intent, leases and idempotent delivery receipts.
 * @pattern Repository
 * @layer Repository
 */
export class MongooseReminderRepository implements ReminderRepository {
    /** Read a job without bypassing soft deletion. */
    async find(id: Types.ObjectId, transaction?: TransactionContext): Promise<ReminderDocument | null> {
        return ReminderJob.findById(id).session(transaction?.session ?? null).exec()
    }
    /** Find a private create retry scoped to its authenticated owner. */
    async findByClient(ownerId: Types.ObjectId, clientMessageId: string, transaction?: TransactionContext): Promise<ReminderDocument | null> {
        return ReminderJob.findOne({ [F.OWNER]: ownerId, [F.CLIENT]: clientMessageId }).session(transaction?.session ?? null).exec()
    }
    /** Replace a current scheduling intent while preserving delivered receipts. */
    async schedule(input: ScheduleReminderInput, transaction: TransactionContext): Promise<ReminderDocument> {
        const existing = await this.findByClient(input.ownerId, input.clientMessageId, transaction)
        if (existing?.status === S.DELIVERED) return existing
        const record = await ReminderJob.findOneAndUpdate({ [F.OWNER]: input.ownerId, [F.CLIENT]: input.clientMessageId }, {
            $set: { ...input, [F.STATUS]: S.PENDING, [F.ATTEMPTS]: 0, [F.TOKEN]: null, [F.LEASE]: null, [F.NEXT]: null },
        }, { upsert: true, returnDocument: "after", session: transaction.session }).exec()
        if (!record) throw new Error("Reminder scheduling did not return a persisted record")
        return record
    }
    /** Cancel every undispatched job affected by a time change or response change. */
    async invalidate(appointmentId: Types.ObjectId, transaction: TransactionContext, ownerId?: Types.ObjectId): Promise<void> {
        await ReminderJob.updateMany({ [F.APPOINTMENT]: appointmentId, ...(ownerId ? { [F.OWNER]: ownerId } : {}), [F.STATUS]: { $in: [S.PENDING, S.CLAIMED] } }, { $set: { [F.STATUS]: S.CANCELLED, [F.TOKEN]: null, [F.LEASE]: null } }, { session: transaction.session }).exec()
    }
    /** Advance only the appointment version of still-valid jobs, retaining their original due time and lease. */
    async rebase(input: { appointmentId: Types.ObjectId; fromRevision: number; toRevision: number }, transaction: TransactionContext): Promise<void> {
        await ReminderJob.updateMany({ [F.APPOINTMENT]: input.appointmentId, [F.REVISION]: input.fromRevision, [F.STATUS]: { $in: [S.PENDING, S.CLAIMED] }, [F.DELETED]: false }, { $set: { [F.REVISION]: input.toRevision } }, { session: transaction.session }).exec()
    }
    /** Read bounded pending/delivered inbox records for one owner. */
    async list(ownerId: Types.ObjectId): Promise<ReminderDocument[]> {
        return ReminderJob.find({ [F.OWNER]: ownerId, [F.STATUS]: { $in: [S.PENDING, S.CLAIMED, S.DELIVERED] } }).sort({ [F.DUE]: -1, [F.ID]: -1 }).limit(UTILITY_LIMITS.LIST).exec()
    }
    /** Mark only previously authorized delivery IDs read. */
    async markRead(ids: readonly Types.ObjectId[], ownerId: Types.ObjectId, now: Date): Promise<void> {
        await ReminderJob.updateMany({ [F.ID]: { $in: ids }, [F.OWNER]: ownerId, [F.STATUS]: S.DELIVERED, [F.READ]: null }, { $set: { [F.READ]: now } }).exec()
    }
    /** Cancel/dismiss a private record without removing its audit trail. */
    async dismiss(id: Types.ObjectId, ownerId: Types.ObjectId): Promise<void> {
        await ReminderJob.updateOne({ [F.ID]: id, [F.OWNER]: ownerId }, { $set: { [F.DELETED]: true, [F.STATUS]: S.CANCELLED, [F.TOKEN]: null } }).exec()
    }
    /** Edit only an undelivered personal message reminder using its current intent. */
    async edit(input: { id: Types.ObjectId; ownerId: Types.ObjectId; dueAt: Date; note: string }, transaction: TransactionContext): Promise<ReminderDocument | null> {
        return ReminderJob.findOneAndUpdate({ [F.ID]: input.id, [F.OWNER]: input.ownerId, [F.APPOINTMENT]: null, [F.STATUS]: { $in: [S.PENDING, S.CLAIMED] } }, { $set: { [F.DUE]: input.dueAt, [F.NOTE]: input.note, [F.STATUS]: S.PENDING, [F.TOKEN]: null, [F.LEASE]: null, [F.NEXT]: null, [F.ATTEMPTS]: 0 } }, { returnDocument: "after", session: transaction.session }).exec()
    }
    /** Atomically recover due jobs or abandoned leases with a bounded attempt count. */
    async claim(now: Date, token: string): Promise<ReminderDocument | null> {
        await ReminderJob.updateMany({ [F.DELETED]: false, [F.STATUS]: S.CLAIMED, [F.LEASE]: { $lte: now }, [F.ATTEMPTS]: { $gte: SCHEDULING_LIMITS.MAX_ATTEMPTS } }, { $set: { [F.STATUS]: S.FAILED, [F.LEASE]: null, [F.TOKEN]: null } }).exec()
        return ReminderJob.findOneAndUpdate({
            [F.DELETED]: false, [F.DUE]: { $lte: now }, [F.ATTEMPTS]: { $lt: SCHEDULING_LIMITS.MAX_ATTEMPTS },
            $and: [ { $or: [{ [F.NEXT]: null }, { [F.NEXT]: { $lte: now } }] }, { $or: [{ [F.STATUS]: S.PENDING }, { [F.STATUS]: S.CLAIMED, [F.LEASE]: { $lte: now } }] } ],
        }, { $set: { [F.STATUS]: S.CLAIMED, [F.TOKEN]: token, [F.LEASE]: new Date(now.getTime() + SCHEDULING_LIMITS.LEASE_MS) }, $inc: { [F.ATTEMPTS]: 1 } }, { returnDocument: "after", sort: { [F.DUE]: 1 } }).exec()
    }
    /** Commit one receipt and completion only if this worker still owns the lease. */
    async complete(job: ReminderDocument, now: Date, transaction: TransactionContext): Promise<boolean> {
        const changed = await ReminderJob.updateOne({ [F.ID]: job._id, [F.STATUS]: S.CLAIMED, [F.TOKEN]: job.leaseToken, [F.LEASE]: { $gt: now }, [F.DELETED]: false }, { $set: { [F.STATUS]: S.DELIVERED, [F.DELIVERED]: now, [F.LEASE]: null, [F.TOKEN]: null } }, { session: transaction.session }).exec()
        if (changed.modifiedCount !== 1) return false
        const previous = await ReminderDelivery.findOne({ [D.JOB]: job._id }).session(transaction.session).exec()
        if (!previous) await ReminderDelivery.create([{ [D.JOB]: job._id, [D.OWNER]: job.ownerId }], { session: transaction.session })
        return !previous
    }
    /** Invalidate a claimed job when its source or owner is no longer eligible. */
    async cancelClaim(job: ReminderDocument, transaction: TransactionContext): Promise<void> {
        await ReminderJob.updateOne({ [F.ID]: job._id, [F.STATUS]: S.CLAIMED, [F.TOKEN]: job.leaseToken }, { $set: { [F.STATUS]: S.CANCELLED, [F.TOKEN]: null, [F.LEASE]: null } }, { session: transaction.session }).exec()
    }
    /** Retry transient failures with capped exponential backoff and retain exhausted failures. */
    async retry(job: ReminderDocument, now: Date): Promise<void> {
        await ReminderJob.updateOne({ [F.ID]: job._id, [F.STATUS]: S.CLAIMED, [F.TOKEN]: job.leaseToken }, { $set: { [F.STATUS]: job.attempts >= SCHEDULING_LIMITS.MAX_ATTEMPTS ? S.FAILED : S.PENDING, [F.NEXT]: new Date(now.getTime() + Math.min(2 ** job.attempts, 60) * 1000), [F.TOKEN]: null, [F.LEASE]: null } }).exec()
    }
}

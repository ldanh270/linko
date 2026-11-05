import { UTILITY_LIMITS } from "@linko/contracts"
import type { Types } from "mongoose"
import { Appointment, type AppointmentRecord } from "../../models/Appointment"
import { AppointmentResponse } from "../../models/AppointmentResponse"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { APPOINTMENT_FIELDS as F, RESPONSE_FIELDS as R } from "./appointment.constants"
import type { AppointmentDocument, AppointmentRepository, AppointmentResponseDocument } from "./appointment.types"

/** Isolate appointment and attendance database access.
 * @pattern Repository
 * @layer Repository
 */
export class MongooseAppointmentRepository implements AppointmentRepository {
    /** Load one active appointment snapshot. */
    async find(id: Types.ObjectId, transaction?: TransactionContext): Promise<AppointmentDocument | null> {
        return Appointment.findById(id).session(transaction?.session ?? null).exec()
    }
    /** Resolve a sender-scoped create retry without writing another resource. */
    async findByClient(input: { conversationId: Types.ObjectId; actorId: Types.ObjectId; clientMessageId: string }, transaction?: TransactionContext): Promise<AppointmentDocument | null> {
        return Appointment.findOne({ [F.CONVERSATION_ID]: input.conversationId, [F.CREATOR_ID]: input.actorId, [F.CLIENT_ID]: input.clientMessageId }).session(transaction?.session ?? null).exec()
    }
    /** Insert the resource within the timeline message transaction. */
    async create(input: Omit<AppointmentRecord, "createdAt" | "updatedAt"> & { _id: Types.ObjectId }, transaction: TransactionContext): Promise<AppointmentDocument> {
        const [record] = await Appointment.create([input], { session: transaction.session })
        return record
    }
    /** Compare-and-swap fields while advancing the optimistic revision. */
    async update(input: { id: Types.ObjectId; revision: number; fields: Partial<AppointmentRecord> }, transaction: TransactionContext): Promise<AppointmentDocument | null> {
        return Appointment.findOneAndUpdate({ [F.ID]: input.id, [F.REVISION]: input.revision }, { $set: input.fields, $inc: { [F.REVISION]: 1 } }, { returnDocument: "after", session: transaction.session }).exec()
    }
    /** Bound appointment detail listings by the shared page-size limit. */
    async list(conversationId: Types.ObjectId): Promise<AppointmentDocument[]> {
        return Appointment.find({ [F.CONVERSATION_ID]: conversationId }).sort({ [F.START]: -1, [F.ID]: -1 }).limit(UTILITY_LIMITS.LIST).exec()
    }
    /** Read named attendance for authorization-filtered mapping. */
    async responses(id: Types.ObjectId, transaction?: TransactionContext): Promise<AppointmentResponseDocument[]> {
        return AppointmentResponse.find({ [R.APPOINTMENT]: id }).session(transaction?.session ?? null).exec()
    }
    /** Replace one member's choice without creating duplicate response rows. */
    async respond(input: { appointmentId: Types.ObjectId; userId: Types.ObjectId; status: string; reminderMinutes: number | null; joinedAt: Date }, transaction: TransactionContext): Promise<void> {
        await AppointmentResponse.findOneAndUpdate({ [R.APPOINTMENT]: input.appointmentId, [R.USER]: input.userId }, { $set: input }, { upsert: true, session: transaction.session }).exec()
    }
}

import type { HydratedDocument, Types } from "mongoose"
import type { AppointmentRecord } from "../../models/Appointment"
import type { AppointmentResponseRecord } from "../../models/AppointmentResponse"
import type { TransactionContext } from "../../shared/persistence/withTransaction"

/** Repository-owned appointment snapshot used by domain services. */
export type AppointmentDocument = HydratedDocument<AppointmentRecord>
/** Repository-owned attendance snapshot. */
export type AppointmentResponseDocument = HydratedDocument<AppointmentResponseRecord>
/** Persistence boundary for appointments and per-member responses. */
export interface AppointmentRepository {
    find(id: Types.ObjectId, transaction?: TransactionContext): Promise<AppointmentDocument | null>
    findByClient(input: { conversationId: Types.ObjectId; actorId: Types.ObjectId; clientMessageId: string }, transaction?: TransactionContext): Promise<AppointmentDocument | null>
    create(input: Omit<AppointmentRecord, "createdAt" | "updatedAt"> & { _id: Types.ObjectId }, transaction: TransactionContext): Promise<AppointmentDocument>
    update(input: { id: Types.ObjectId; revision: number; fields: Partial<AppointmentRecord> }, transaction: TransactionContext): Promise<AppointmentDocument | null>
    list(conversationId: Types.ObjectId): Promise<AppointmentDocument[]>
    responses(id: Types.ObjectId, transaction?: TransactionContext): Promise<AppointmentResponseDocument[]>
    respond(input: { appointmentId: Types.ObjectId; userId: Types.ObjectId; status: string; reminderMinutes: number | null; joinedAt: Date }, transaction: TransactionContext): Promise<void>
}

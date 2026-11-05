import { UTILITY_LIMITS } from "@linko/contracts"
import type { Types } from "mongoose"
import { Appointment, type AppointmentRecord } from "../../models/Appointment"
import { AppointmentResponse } from "../../models/AppointmentResponse"
import Conversation from "../../models/Conversation"
import Message from "../../models/Message"
import type { TransactionContext } from "../../shared/persistence/withTransaction"
import { CONVERSATION_FIELDS as C, PARTICIPANT_FIELDS as P } from "../conversation/conversation.constants"
import { MESSAGE_MODEL_FIELDS as M } from "../message/message.constants"
import type { UtilityActor } from "../utility/utility.types"
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
    /** Filter a bounded conversation list through one viewer-visible source-message query. */
    async listVisible(actor: UtilityActor, joinedAt: Date): Promise<AppointmentDocument[]> {
        const records = await Appointment.find({ [F.CONVERSATION_ID]: actor.conversationId }).sort({ [F.START]: -1, [F.ID]: -1 }).limit(UTILITY_LIMITS.LIST).exec()
        const sources = await Message.find({ [M.ID]: { $in: records.map((record) => record.messageId) }, [M.CONVERSATION_ID]: actor.conversationId, [M.CREATED_AT]: { $gte: joinedAt }, [M.HIDDEN_BY]: { $ne: actor.actorId } }).select(M.ID).exec()
        const visibleIds = new Set(sources.map((source) => source._id.toString()))
        return records.filter((record) => visibleIds.has(record.messageId.toString()))
    }
    /** Read named attendance for authorization-filtered mapping. */
    async responses(id: Types.ObjectId, transaction?: TransactionContext): Promise<AppointmentResponseDocument[]> {
        return AppointmentResponse.find({ [R.APPOINTMENT]: id }).session(transaction?.session ?? null).exec()
    }
    /** Hydrate attendance for one conversation without per-appointment or per-attendee reads. */
    async eligibleResponsesMany(records: readonly AppointmentDocument[], transaction?: TransactionContext): Promise<ReadonlyMap<string, readonly AppointmentResponseDocument[]>> {
        const results = new Map<string, AppointmentResponseDocument[]>(records.map((record) => [record._id.toString(), []]))
        const first = records[0]
        if (!first) return results
        const session = transaction?.session ?? null
        const conversation = await Conversation.findById(first.conversationId).session(session).exec()
        if (!conversation) return results
        const sources = await Message.find({ [M.ID]: { $in: records.map((record) => record.messageId) }, [M.CONVERSATION_ID]: first.conversationId }).session(session).exec()
        const bySource = new Map(sources.map((source) => [source._id.toString(), source]))
        const byRecord = new Map(records.map((record) => [record._id.toString(), record]))
        const members = new Map(conversation[C.PARTICIPANTS].filter((member) => member[P.DEL_FLAG] !== true && !member[P.LEFT_AT]).map((member) => [member[P.USER_ID].toString(), member]))
        const responses = await AppointmentResponse.find({ [R.APPOINTMENT]: { $in: records.map((record) => record._id) } }).session(session).exec()
        for (const response of responses) {
            const record = byRecord.get(response.appointmentId.toString())
            const source = record ? bySource.get(record.messageId.toString()) : undefined
            const member = members.get(response.userId.toString())
            if (!source || !member) continue
            const joinedAt = member[P.JOINED_AT] ?? conversation[C.CREATED_AT]
            const clearedAt = member[P.CLEARED_HISTORY_AT]
            const boundary = clearedAt && clearedAt > joinedAt ? clearedAt : joinedAt
            const hidden = source[M.HIDDEN_BY].some((userId) => userId.equals(response.userId))
            if (response.joinedAt >= boundary && source[M.CREATED_AT] >= boundary && !hidden) results.get(response.appointmentId.toString())?.push(response)
        }
        return results
    }
    /** Replace one member's choice without creating duplicate response rows. */
    async respond(input: { appointmentId: Types.ObjectId; userId: Types.ObjectId; status: string; reminderMinutes: number | null; joinedAt: Date }, transaction: TransactionContext): Promise<void> {
        await AppointmentResponse.findOneAndUpdate({ [R.APPOINTMENT]: input.appointmentId, [R.USER]: input.userId }, { $set: input }, { upsert: true, session: transaction.session }).exec()
    }
}

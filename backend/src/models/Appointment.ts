import mongoose, { type InferSchemaType } from "mongoose"
import { UTILITY_LIMITS, UTILITY_STATUS } from "@linko/contracts"
import { auditPlugin } from "../shared/persistence/auditPlugin"
import { softDeletePlugin } from "../shared/persistence/softDeletePlugin"
import { APPOINTMENT_FIELDS as F, SCHEDULING_LIMITS } from "../modules/appointment/appointment.constants"

const schema = new mongoose.Schema({
    [F.CONVERSATION_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.MESSAGE_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.CREATOR_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.CLIENT_ID]: { type: String, required: true },
    [F.TITLE]: { type: String, required: true, maxlength: UTILITY_LIMITS.TITLE },
    [F.DESCRIPTION]: { type: String, default: "", maxlength: UTILITY_LIMITS.DESCRIPTION },
    [F.START]: { type: Date, required: true }, [F.END]: { type: Date, default: null },
    [F.ZONE]: { type: String, required: true }, [F.PLACE]: { type: String, default: "", maxlength: SCHEDULING_LIMITS.MAX_PLACE },
    [F.STATUS]: { type: String, enum: [UTILITY_STATUS.ACTIVE, UTILITY_STATUS.CANCELLED], default: UTILITY_STATUS.ACTIVE, required: true },
    [F.REVISION]: { type: Number, default: 1, required: true },
}, { timestamps: true })
schema.plugin(auditPlugin)
schema.plugin(softDeletePlugin)
schema.index({ [F.CONVERSATION_ID]: 1, [F.START]: 1 }, { name: "appointment_conversation_start" })
schema.index({ [F.CONVERSATION_ID]: 1, [F.CREATOR_ID]: 1, [F.CLIENT_ID]: 1 }, { unique: true, name: "appointment_create_key", partialFilterExpression: { delFlag: false } })
/** Persisted appointment state, independent from HTTP DTOs. */
export type AppointmentRecord = InferSchemaType<typeof schema>
/** Appointment persistence model; writes are owned by the appointment repository. */
export const Appointment = mongoose.model("Appointment", schema)

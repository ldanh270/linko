import mongoose, { type InferSchemaType } from "mongoose"
import { RSVP_STATUS } from "@linko/contracts"
import { auditPlugin } from "../shared/persistence/auditPlugin"
import { softDeletePlugin } from "../shared/persistence/softDeletePlugin"
import { RESPONSE_FIELDS as F } from "../modules/appointment/appointment.constants"

const schema = new mongoose.Schema({
    [F.APPOINTMENT]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.USER]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.STATUS]: { type: String, enum: Object.values(RSVP_STATUS), required: true },
    [F.OFFSET]: { type: Number, default: null }, [F.JOINED]: { type: Date, required: true },
}, { timestamps: true })
schema.plugin(auditPlugin)
schema.plugin(softDeletePlugin)
schema.index({ [F.APPOINTMENT]: 1, [F.USER]: 1 }, { unique: true, name: "appointment_response_user", partialFilterExpression: { delFlag: false } })
/** Persisted per-member RSVP and explicit personal reminder preference. */
export type AppointmentResponseRecord = InferSchemaType<typeof schema>
/** Attendance persistence model, accessible only through its feature repository. */
export const AppointmentResponse = mongoose.model("AppointmentResponse", schema)

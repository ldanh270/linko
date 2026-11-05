import mongoose from "mongoose"
import { auditPlugin } from "../shared/persistence/auditPlugin"
import { softDeletePlugin } from "../shared/persistence/softDeletePlugin"
import { DELIVERY_FIELDS as F } from "../modules/reminder/reminder.constants"

const schema = new mongoose.Schema({
    [F.JOB]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.OWNER]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true })
schema.plugin(auditPlugin)
schema.plugin(softDeletePlugin)
schema.index({ [F.JOB]: 1 }, { unique: true, name: "reminder_delivery_once", partialFilterExpression: { delFlag: false } })
/** Unique durable delivery receipts prevent duplicate inbox records after worker recovery. */
export const ReminderDelivery = mongoose.model("ReminderDelivery", schema)

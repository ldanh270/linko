import mongoose, { type InferSchemaType } from "mongoose"
import { auditPlugin } from "../shared/persistence/auditPlugin"
import { softDeletePlugin } from "../shared/persistence/softDeletePlugin"
import { REMINDER_FIELDS as F, REMINDER_STATUS } from "../modules/reminder/reminder.constants"
import { SCHEDULING_LIMITS } from "../modules/appointment/appointment.constants"

const schema = new mongoose.Schema({
    [F.OWNER]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.CONVERSATION]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.MESSAGE]: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    [F.APPOINTMENT]: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    [F.REVISION]: { type: Number, default: null }, [F.CLIENT]: { type: String, required: true },
    [F.TITLE]: { type: String, required: true }, [F.NOTE]: { type: String, default: "", maxlength: SCHEDULING_LIMITS.MAX_NOTE },
    [F.DUE]: { type: Date, required: true }, [F.STATUS]: { type: String, enum: Object.values(REMINDER_STATUS), required: true, default: REMINDER_STATUS.PENDING },
    [F.ATTEMPTS]: { type: Number, default: 0, required: true }, [F.LEASE]: { type: Date, default: null },
    [F.TOKEN]: { type: String, default: null }, [F.NEXT]: { type: Date, default: null },
    [F.DELIVERED]: { type: Date, default: null }, [F.READ]: { type: Date, default: null },
}, { timestamps: true })
schema.plugin(auditPlugin)
schema.plugin(softDeletePlugin)
schema.index({ [F.OWNER]: 1, [F.CLIENT]: 1 }, { unique: true, name: "reminder_owner_create_key", partialFilterExpression: { delFlag: false } })
schema.index({ [F.STATUS]: 1, [F.DUE]: 1, [F.LEASE]: 1, [F.NEXT]: 1 }, { name: "reminder_due_claim" })
schema.index({ [F.OWNER]: 1, [F.DUE]: -1, [F.ID]: -1 }, { name: "reminder_owner_inbox" })
/** Durable reminder job and user-visible inbox lifecycle. */
export type ReminderJobRecord = InferSchemaType<typeof schema>
/** Job persistence model; scheduled processing never relies on browser timers. */
export const ReminderJob = mongoose.model("ReminderJob", schema)

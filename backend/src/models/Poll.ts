import mongoose from "mongoose"
import { POLL_MODE, UTILITY_STATUS } from "@linko/contracts"
import { auditPlugin } from "../shared/persistence/auditPlugin"
import { softDeletePlugin } from "../shared/persistence/softDeletePlugin"
import { POLL_FIELDS as F, POLL_INDEXES } from "../modules/poll/poll.constants"

const optionSchema = new mongoose.Schema({ [F.TEXT]: { type: String, required: true } })
const schema = new mongoose.Schema({
    [F.CONVERSATION_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Conversation" },
    [F.MESSAGE_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Message" },
    [F.CREATOR_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", index: true },
    [F.CLIENT_ID]: { type: String, required: true }, [F.QUESTION]: { type: String, required: true },
    [F.OPTIONS]: { type: [optionSchema], required: true }, [F.MODE]: { type: String, enum: Object.values(POLL_MODE), required: true },
    [F.CLOSES_AT]: { type: Date, default: null }, [F.STATUS]: { type: String, enum: [UTILITY_STATUS.ACTIVE, UTILITY_STATUS.CLOSED], default: UTILITY_STATUS.ACTIVE },
    [F.REVISION]: { type: Number, default: 1 },
}, { timestamps: true })
schema.plugin(auditPlugin)
schema.plugin(softDeletePlugin)
schema.index({ [F.CONVERSATION_ID]: 1, [F.CREATED_AT]: -1 }, { name: POLL_INDEXES.CONVERSATION })
schema.index({ [F.MESSAGE_ID]: 1 }, { name: POLL_INDEXES.MESSAGE, unique: true, partialFilterExpression: { [F.DELETED]: false } })
schema.index({ [F.CONVERSATION_ID]: 1, [F.CREATOR_ID]: 1, [F.CLIENT_ID]: 1 }, { name: POLL_INDEXES.IDEMPOTENCY, unique: true, partialFilterExpression: { [F.DELETED]: false } })

/** Persist poll definitions independently of each person's current vote. */
const Poll = mongoose.model("Poll", schema)
export default Poll
/** Inferred persisted poll definition. */
export type PollRecord = mongoose.InferSchemaType<typeof schema>

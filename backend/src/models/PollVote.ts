import mongoose from "mongoose"
import { auditPlugin } from "../shared/persistence/auditPlugin"
import { softDeletePlugin } from "../shared/persistence/softDeletePlugin"
import { POLL_FIELDS as F, POLL_INDEXES } from "../modules/poll/poll.constants"

const schema = new mongoose.Schema({
    [F.POLL_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Poll", index: true },
    [F.USER_ID]: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    [F.OPTION_IDS]: { type: [mongoose.Schema.Types.ObjectId], required: true }, [F.VOTED_AT]: { type: Date, required: true },
}, { timestamps: true })
schema.plugin(auditPlugin)
schema.plugin(softDeletePlugin)
schema.index({ [F.POLL_ID]: 1, [F.USER_ID]: 1 }, { name: POLL_INDEXES.VOTE, unique: true, partialFilterExpression: { [F.DELETED]: false } })
schema.index({ [F.USER_ID]: 1 }, { name: POLL_INDEXES.VOTE_USER })

/** Persist one replaceable complete named selection per poll and user. */
const PollVote = mongoose.model("PollVote", schema)
export default PollVote

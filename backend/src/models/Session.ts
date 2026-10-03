import mongoose from "mongoose"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        refreshToken: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: true,
    },
)

sessionSchema.plugin(auditPlugin)
sessionSchema.plugin(softDeletePlugin)
sessionSchema.index({ refreshToken: 1 }, { unique: true, name: "active_refresh_token_unique", partialFilterExpression: { delFlag: false } })
sessionSchema.index({ expiresAt: 1 }, { name: "active_session_expiry" })

const Session = mongoose.model("Session", sessionSchema)

export default Session

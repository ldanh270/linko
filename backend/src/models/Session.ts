import mongoose from "mongoose"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"
import { AUTH_FIELDS } from "#/modules/auth/auth.constants"

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        [AUTH_FIELDS.REFRESH_TOKEN]: {
            type: String,
            required: false,
        },
        [AUTH_FIELDS.REFRESH_TOKEN_HASH]: {
            type: String,
            required: false,
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

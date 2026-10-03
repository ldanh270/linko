import { AUTH_FIELDS, AUTH_INDEX_NAMES } from "#/modules/auth/auth.constants"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"
import mongoose from "mongoose"

const sessionSchema = new mongoose.Schema(
    {
        [AUTH_FIELDS.USER_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        [AUTH_FIELDS.REFRESH_TOKEN_HASH]: {
            type: String,
            required: true,
        },
        [AUTH_FIELDS.EXPIRES_AT]: {
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
sessionSchema.index(
    { [AUTH_FIELDS.REFRESH_TOKEN_HASH]: 1 },
    {
        unique: true,
        name: AUTH_INDEX_NAMES.REFRESH_TOKEN_HASH,
        partialFilterExpression: { [AUTH_FIELDS.DELETED]: false },
    },
)
sessionSchema.index({ [AUTH_FIELDS.EXPIRES_AT]: 1 }, { name: "active_session_expiry" })

const Session = mongoose.model("Session", sessionSchema)

export default Session

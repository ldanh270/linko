import mongoose, { type InferSchemaType } from "mongoose"
import { INVITATION_LIMITS } from "@linko/contracts"

import { auditPlugin } from "../../shared/persistence/auditPlugin"
import { softDeletePlugin } from "../../shared/persistence/softDeletePlugin"
import {
    INVITATION_MODEL_FIELDS,
    INVITATION_PERSISTENCE_LIMITS,
    INVITATION_PERSISTENCE_PATTERNS,
} from "./invitation.constants"

const invitationSchema = new mongoose.Schema(
    {
        [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        [INVITATION_MODEL_FIELDS.TOKEN_HASH]: {
            type: String,
            required: true,
            minlength: INVITATION_LIMITS.TOKEN_HASH_LENGTH,
            maxlength: INVITATION_LIMITS.TOKEN_HASH_LENGTH,
            match: INVITATION_PERSISTENCE_PATTERNS.TOKEN_HASH,
        },
        /** Preserve retry identity without retaining the raw client request key. */
        [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: {
            type: String,
            required: true,
            minlength: INVITATION_LIMITS.TOKEN_HASH_LENGTH,
            maxlength: INVITATION_LIMITS.TOKEN_HASH_LENGTH,
            match: INVITATION_PERSISTENCE_PATTERNS.IDEMPOTENCY_KEY_HASH,
        },
        [INVITATION_MODEL_FIELDS.EXPIRES_AT]: {
            type: Date,
            required: true,
        },
        [INVITATION_MODEL_FIELDS.MAX_USES]: {
            type: Number,
            required: true,
            default: INVITATION_LIMITS.MAX_USES,
            min: 1,
        },
        [INVITATION_MODEL_FIELDS.USE_COUNT]: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        [INVITATION_MODEL_FIELDS.REVOKED_AT]: {
            type: Date,
            default: null,
        },
        [INVITATION_MODEL_FIELDS.CREATED_AT]: {
            type: Date,
            default: Date.now,
            immutable: true,
        },
    },
    {
        timestamps: { createdAt: false, updatedAt: INVITATION_MODEL_FIELDS.UPDATED_AT },
    },
)

invitationSchema.pre("validate", function () {
    if (this.isNew) {
        this[INVITATION_MODEL_FIELDS.EXPIRES_AT] = new Date(
            this[INVITATION_MODEL_FIELDS.CREATED_AT].getTime() + INVITATION_PERSISTENCE_LIMITS.EXPIRATION_MS,
        )
    }
})

invitationSchema.plugin(auditPlugin)
invitationSchema.plugin(softDeletePlugin)
invitationSchema.index({ [INVITATION_MODEL_FIELDS.TOKEN_HASH]: 1 }, { unique: true })
invitationSchema.index({ [INVITATION_MODEL_FIELDS.IDEMPOTENCY_KEY_HASH]: 1 }, { unique: true })
invitationSchema.index({
    [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: 1,
    [INVITATION_MODEL_FIELDS.CREATED_AT]: -1,
})
invitationSchema.index(
    { [INVITATION_MODEL_FIELDS.CONVERSATION_ID]: 1 },
    {
        name: "one_unrevoked_invitation_per_conversation",
        unique: true,
        partialFilterExpression: {
            [INVITATION_MODEL_FIELDS.REVOKED_AT]: null,
            delFlag: false,
        },
    },
)

/** Inferred invitation fields after Mongoose applies the schema defaults. */
export type InvitationType = InferSchemaType<typeof invitationSchema>

/** Persist secret-free invitation metadata and a one-way token hash. */
const Invitation = mongoose.model<InvitationType>("Invitation", invitationSchema)

export default Invitation

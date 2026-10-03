import mongoose, { InferSchemaType } from "mongoose"
import { GROUP_USER_FIELDS } from "#/modules/conversation/conversation.constants"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        hashedPassword: {
            type: String,
            required: true,
        },

        displayName: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            sparse: true, // Can empty. But if not empty must unique
        },

        avatar: {
            // Link CDN to display
            url: {
                type: String,
            },

            // R2 key with an r2: prefix, or a legacy Cloudinary public ID.
            id: {
                type: String,
            },
        },

        background: {
            url: {
                type: String,
            },
            id: {
                type: String,
            },
        },

        bio: {
            type: String,
            maxlength: 500,
        },

        lastActive: {
            type: Date,
            default: Date.now(),
            index: true,
        },

        [GROUP_USER_FIELDS.GROUP_CONVERSATION_COUNT]: {
            type: Number,
            min: 0,
            default: undefined,
            select: false,
        },
    },
    {
        // Auto create createdAt & updatedAt
        timestamps: true,
    },
)

userSchema.plugin(auditPlugin)
userSchema.plugin(softDeletePlugin)
userSchema.index({ username: 1, displayName: 1, email: 1 })
userSchema.index({ username: 1 }, { unique: true, name: "active_username_unique", partialFilterExpression: { delFlag: false } })
userSchema.index({ email: 1 }, { unique: true, name: "active_email_unique", partialFilterExpression: { delFlag: false } })

const User = mongoose.model("User", userSchema)

export default User

export type UserType = InferSchemaType<typeof userSchema>

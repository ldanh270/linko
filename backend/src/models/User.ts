import mongoose, { InferSchemaType } from "mongoose"

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
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
            unique: true,
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

            // Cloundinary public id to delete avatar
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
    },
    {
        // Auto create createdAt & updatedAt
        timestamps: true,
    },
)

userSchema.index({ username: 1, displayName: 1, email: 1 })

const User = mongoose.model("User", userSchema)

export default User

export type UserType = InferSchemaType<typeof userSchema>

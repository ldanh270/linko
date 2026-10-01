import mongoose, { InferSchemaType } from "mongoose"

const friendRequestSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            maxLength: 300,
        },
    },
    {
        // Auto create createdAt & updatedAt
        timestamps: true,
    },
)

// To avoid duplicate requests
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true })

// To get sent requests
friendRequestSchema.index({ from: 1 })

// To get recieved requests
friendRequestSchema.index({ to: 1 })

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema)

export default FriendRequest

export type FriendRequestType = InferSchemaType<typeof friendRequestSchema>

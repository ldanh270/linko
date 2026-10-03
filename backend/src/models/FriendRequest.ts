import mongoose, { InferSchemaType } from "mongoose"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"

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

friendRequestSchema.plugin(auditPlugin)
friendRequestSchema.plugin(softDeletePlugin)
friendRequestSchema.index({ from: 1, to: 1 }, { unique: true, name: "active_friend_request_unique", partialFilterExpression: { delFlag: false } })

// To get sent requests
friendRequestSchema.index({ from: 1 })

// To get recieved requests
friendRequestSchema.index({ to: 1 })

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema)

export default FriendRequest

export type FriendRequestType = InferSchemaType<typeof friendRequestSchema>

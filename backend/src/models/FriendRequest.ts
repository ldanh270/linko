import mongoose, { InferSchemaType } from "mongoose"
import { FRIEND_INDEX_NAMES, FRIEND_REQUEST_MODEL_FIELDS } from "../modules/friend/friend.constants"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"

const friendRequestSchema = new mongoose.Schema(
    {
        [FRIEND_REQUEST_MODEL_FIELDS.FROM]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        [FRIEND_REQUEST_MODEL_FIELDS.TO]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        [FRIEND_REQUEST_MODEL_FIELDS.MESSAGE]: {
            type: String,
            maxLength: 300,
        },
        [FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_A]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        [FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_B]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        // Auto create createdAt & updatedAt
        timestamps: true,
    },
)
friendRequestSchema.index(
    {
        [FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_A]: 1,
        [FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_B]: 1,
    },
    {
        unique: true,
        name: FRIEND_INDEX_NAMES.ACTIVE_FRIEND_REQUEST_PAIR,
        partialFilterExpression: {
            [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: false,
            [FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_A]: { $exists: true },
            [FRIEND_REQUEST_MODEL_FIELDS.PAIR_USER_B]: { $exists: true },
        },
    },
)

friendRequestSchema.plugin(auditPlugin)
friendRequestSchema.plugin(softDeletePlugin)
friendRequestSchema.index(
    {
        [FRIEND_REQUEST_MODEL_FIELDS.FROM]: 1,
        [FRIEND_REQUEST_MODEL_FIELDS.TO]: 1,
    },
    {
        unique: true,
        name: FRIEND_INDEX_NAMES.ACTIVE_FRIEND_REQUEST,
        partialFilterExpression: { [FRIEND_REQUEST_MODEL_FIELDS.DEL_FLAG]: false },
    },
)

// To get sent requests
friendRequestSchema.index({ [FRIEND_REQUEST_MODEL_FIELDS.FROM]: 1 })

// To get recieved requests
friendRequestSchema.index({ [FRIEND_REQUEST_MODEL_FIELDS.TO]: 1 })

const FriendRequest = mongoose.model("FriendRequest", friendRequestSchema)

export default FriendRequest

export type FriendRequestType = InferSchemaType<typeof friendRequestSchema>

import mongoose, { InferSchemaType } from "mongoose"
import { FRIEND_INDEX_NAMES, FRIENDSHIP_FIELDS } from "../modules/friend/friend.constants"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"

export { FRIENDSHIP_FIELDS } from "../modules/friend/friend.constants"

const friendshipSchema = new mongoose.Schema(
    {
        [FRIENDSHIP_FIELDS.USER_A]: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        [FRIENDSHIP_FIELDS.USER_B]: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
    },
    {
        // Auto create createdAt & updatedAt
        timestamps: true,
    },
)

// To auto sort friendship by id (a < b) for avoid duplicate
friendshipSchema.pre("save", async function () {
    const a = this[FRIENDSHIP_FIELDS.USER_A].toString()
    const b = this[FRIENDSHIP_FIELDS.USER_B].toString()

    if (a > b) {
        this[FRIENDSHIP_FIELDS.USER_A] = new mongoose.Types.ObjectId(b)
        this[FRIENDSHIP_FIELDS.USER_B] = new mongoose.Types.ObjectId(a)
    }
})

friendshipSchema.plugin(auditPlugin)
friendshipSchema.plugin(softDeletePlugin)
friendshipSchema.index(
    { [FRIENDSHIP_FIELDS.USER_A]: 1, [FRIENDSHIP_FIELDS.USER_B]: 1 },
    {
        unique: true,
        name: FRIEND_INDEX_NAMES.ACTIVE_FRIENDSHIP,
        partialFilterExpression: { [FRIENDSHIP_FIELDS.DEL_FLAG]: false },
    },
)

const Friendship = mongoose.model("Friendship", friendshipSchema)

export default Friendship

export type FriendshipType = InferSchemaType<typeof friendshipSchema>

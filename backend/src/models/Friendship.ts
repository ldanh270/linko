import mongoose, { InferSchemaType } from "mongoose"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"

const friendshipSchema = new mongoose.Schema(
    {
        userA: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User",
        },
        userB: {
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
    const a = this.userA.toString()
    const b = this.userB.toString()

    if (a > b) {
        this.userA = new mongoose.Types.ObjectId(b)
        this.userB = new mongoose.Types.ObjectId(a)
    }
})

friendshipSchema.plugin(auditPlugin)
friendshipSchema.plugin(softDeletePlugin)
friendshipSchema.index({ userA: 1, userB: 1 }, { unique: true, name: "active_friendship_unique", partialFilterExpression: { delFlag: false } })

const Friendship = mongoose.model("Friendship", friendshipSchema)

export default Friendship

export type FriendshipType = InferSchemaType<typeof friendshipSchema>

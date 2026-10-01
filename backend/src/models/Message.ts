import mongoose, { InferSchemaType } from "mongoose"

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
            index: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        content: {
            type: String,
            trim: true,
        },

        // Metadata
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
        mentions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        reactions: [
            {
                participant: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                emoji: {
                    type: String,
                    enum: ["LIKE", "LOVE", "HAHA", "WOW", "SAD", "ANGRY"],
                },
            },
        ],
        attachments: [
            {
                // Link CDN to display
                url: {
                    type: String,
                },
                // Cloundinary public id to delete avatar
                id: {
                    type: String,
                },
            },
        ],

        // For "Delete for me only" feature
        hiddenBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        // Auto create createdAt & updatedAt
        timestamps: true,
    },
)

messageSchema.index({ conversationId: 1, createdAt: -1 })

const Message = mongoose.model("Message", messageSchema)

export default Message

export type MessageType = InferSchemaType<typeof messageSchema>

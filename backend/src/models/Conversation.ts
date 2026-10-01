import mongoose, { InferSchemaType } from "mongoose"

const lastMessageSchema = new mongoose.Schema(
    {
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        content: {
            type: String,
            default: null,
        },
        createdAt: {
            type: Date,
            default: null,
        },
    },
    {
        _id: false,
    },
)

const participantSchema = new mongoose.Schema(
    {
        // User informations
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        nickname: {
            type: String,
            trim: true,
        },
        role: {
            type: String,
            enum: ["OWNER", "ADMIN", "MEMBER", "DIRECT"],
            required: true,
        },

        // User settings
        isArchived: {
            type: Boolean,
            default: false,
        },
        mutedUntil: {
            type: Date,
            default: null,
        },
        clearedHistoryAt: {
            type: Date,
            default: Date.now,
        },

        joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        _id: false,
    },
)

// Group info: Only for group conversation
const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
        },

        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        description: {
            type: String,
            trim: true,
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
    },
    {
        _id: false,
    },
)

const conversationSchema = new mongoose.Schema(
    {
        conversationType: {
            type: String,
            enum: ["DIRECT", "GROUP"],
            required: true,
        },

        participants: {
            type: [participantSchema],
            required: true,
        },

        // Only for group conversations
        group: {
            type: groupSchema,
        },

        lastMessage: {
            type: lastMessageSchema,
            default: null,
        },

        // List of { participantId: unreadMessageNumber }
        unreadCount: {
            type: Map,
            of: Number,
            default: {},
        },
        seenBy: [
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

// To get latest messsages when open app or open specific conversation
conversationSchema.index({ "participant.userId": 1, "lastMessage.createdAt": -1 }) // participant.userId => ASC, lastMessage.createdAt => DESC

// To auto sort participants by id (a < b) for avoid duplicate
conversationSchema.pre("save", function () {
    if (this.conversationType === "DIRECT" && this.participants && this.participants.length > 0) {
        this.participants.sort((a, b) => {
            if (a.userId.toString() < b.userId.toString()) return -1
            if (a.userId.toString() > b.userId.toString()) return 1
            return 0
        })
    }
})

export type ConversationType = InferSchemaType<typeof conversationSchema>

const Conversation = mongoose.model<ConversationType>("Conversation", conversationSchema)

export default Conversation

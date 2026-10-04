import mongoose, { InferSchemaType } from "mongoose"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"
import { MESSAGE_INDEX_NAMES, MESSAGE_MODEL_FIELDS } from "#/modules/message/message.constants"
import { MESSAGE_LIMITS } from "@linko/contracts"

const messageSchema = new mongoose.Schema(
    {
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
            index: true,
        },
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        [MESSAGE_MODEL_FIELDS.CONTENT]: {
            type: String,
            trim: true,
        },

        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: {
            type: String,
            required: true,
            maxlength: MESSAGE_LIMITS.CLIENT_MESSAGE_ID_LENGTH,
        },

        [MESSAGE_MODEL_FIELDS.REPLY_TO]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },
        [MESSAGE_MODEL_FIELDS.MENTIONS]: [
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
                // Historical public URL; new R2 attachments use the protected application route.
                url: {
                    type: String,
                },
                id: {
                    type: String,
                },
                name: {
                    type: String,
                },
                contentType: {
                    type: String,
                },
                size: {
                    type: Number,
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

messageSchema.plugin(auditPlugin)
messageSchema.plugin(softDeletePlugin)
messageSchema.index(
    {
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: 1,
        [MESSAGE_MODEL_FIELDS.SENDER_ID]: 1,
        [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: 1,
    },
    {
        unique: true,
        name: MESSAGE_INDEX_NAMES.IDEMPOTENCY,
        // Historical records predate the key; new service writes always provide it.
        partialFilterExpression: { [MESSAGE_MODEL_FIELDS.CLIENT_MESSAGE_ID]: { $type: "string" } },
    },
)
messageSchema.index(
    {
        [MESSAGE_MODEL_FIELDS.CONVERSATION_ID]: 1,
        [MESSAGE_MODEL_FIELDS.CREATED_AT]: -1,
        [MESSAGE_MODEL_FIELDS.ID]: -1,
    },
    { name: MESSAGE_INDEX_NAMES.CURSOR },
)

const Message = mongoose.model("Message", messageSchema)

export default Message

export type MessageType = InferSchemaType<typeof messageSchema>

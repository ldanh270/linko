import mongoose, { InferSchemaType } from "mongoose"
import { CONVERSATION_STATUS, CONVERSATION_TYPE, GROUP_FIELDS, GROUP_LIMITS, PIN_LIMITS, ROLE } from "@linko/contracts"
import {
    CONVERSATION_FIELDS,
    GROUP_AVATAR_FIELDS,
    GROUP_MESSAGES,
    LAST_MESSAGE_FIELDS,
    PARTICIPANT_FIELDS,
} from "#/modules/conversation/conversation.constants"
import { auditPlugin } from "#/shared/persistence/auditPlugin"
import { softDeletePlugin } from "#/shared/persistence/softDeletePlugin"
import { PIN_ERROR_MESSAGES } from "#/modules/pin/pin.constants"
import { DIRECT_CONVERSATION_FIELDS, FRIEND_INDEX_NAMES } from "../modules/friend/friend.constants"

const lastMessageSchema = new mongoose.Schema(
    {
        [LAST_MESSAGE_FIELDS.MESSAGE_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        },

        [LAST_MESSAGE_FIELDS.SENDER_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        [LAST_MESSAGE_FIELDS.CONTENT]: {
            type: String,
            default: null,
        },
        [LAST_MESSAGE_FIELDS.CREATED_AT]: {
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
        [PARTICIPANT_FIELDS.USER_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        [PARTICIPANT_FIELDS.NICKNAME]: {
            type: String,
            trim: true,
        },
        [PARTICIPANT_FIELDS.ROLE]: {
            type: String,
            enum: Object.values(ROLE),
            required: true,
        },

        // User settings
        [PARTICIPANT_FIELDS.IS_ARCHIVED]: {
            type: Boolean,
            default: false,
        },
        /** Per-participant group toast preference; legacy expiry remains readable during migration. */
        [PARTICIPANT_FIELDS.IS_MUTED]: {
            type: Boolean,
            default: false,
        },
        [PARTICIPANT_FIELDS.MUTED_UNTIL]: {
            type: Date,
            default: null,
        },
        [PARTICIPANT_FIELDS.CLEARED_HISTORY_AT]: {
            type: Date,
            default: Date.now,
        },

        [PARTICIPANT_FIELDS.JOINED_AT]: {
            type: Date,
            default: Date.now,
        },
        [PARTICIPANT_FIELDS.LEFT_AT]: {
            type: Date,
            default: null,
        },
        [PARTICIPANT_FIELDS.LAST_READ_AT]: {
            type: Date,
            default: null,
        },
        [PARTICIPANT_FIELDS.LAST_READ_MESSAGE_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        [PARTICIPANT_FIELDS.DEL_FLAG]: {
            type: Boolean,
            default: false,
        },
    },
    {
        _id: false,
    },
)

// Group info: Only for group conversation
const groupSchema = new mongoose.Schema(
    {
        [GROUP_FIELDS.NAME]: {
            type: String,
            trim: true,
            required: true,
            minlength: [GROUP_LIMITS.MIN_NAME_LENGTH, GROUP_MESSAGES.INVALID_NAME],
            maxlength: [GROUP_LIMITS.MAX_NAME_LENGTH, GROUP_MESSAGES.INVALID_NAME],
        },

        [GROUP_FIELDS.OWNER_ID]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        [GROUP_FIELDS.DESCRIPTION]: {
            type: String,
            trim: true,
            maxlength: [GROUP_LIMITS.MAX_DESCRIPTION_LENGTH, GROUP_MESSAGES.INVALID_DESCRIPTION],
        },

        [GROUP_FIELDS.AVATAR]: {
            // Link CDN to display
            [GROUP_AVATAR_FIELDS.URL]: {
                type: String,
            },

            // Cloundinary public id to delete avatar
            [GROUP_AVATAR_FIELDS.ID]: {
                type: String,
            },
        },

        /** Group pin IDs stay newest-first and are bounded by the server-side atomic update. */
        [GROUP_FIELDS.PINNED_MESSAGE_IDS]: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
            default: [],
            validate: {
                validator: (messageIds: readonly unknown[]) => messageIds.length <= PIN_LIMITS.MAX_PINNED_MESSAGES,
                message: PIN_ERROR_MESSAGES.PIN_LIMIT,
            },
        },
    },
    {
        _id: false,
    },
)

const conversationSchema = new mongoose.Schema(
    {
        [CONVERSATION_FIELDS.TYPE]: {
            type: String,
            enum: Object.values(CONVERSATION_TYPE),
            required: true,
        },
        [CONVERSATION_FIELDS.STATUS]: {
            type: String,
            enum: Object.values(CONVERSATION_STATUS),
            default: CONVERSATION_STATUS.ACTIVE,
            required: true,
        },
        [DIRECT_CONVERSATION_FIELDS.USER_A]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        [DIRECT_CONVERSATION_FIELDS.USER_B]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        [CONVERSATION_FIELDS.PARTICIPANTS]: {
            type: [participantSchema],
            required: true,
            validate: {
                validator: (participants: readonly unknown[]) =>
                    participants.filter((participant) => !isDeletedParticipant(participant)).length
                    <= GROUP_LIMITS.MAX_MEMBERS_PER_GROUP,
                message: GROUP_MESSAGES.MEMBER_LIMIT,
            },
        },

        // Only for group conversations
        [CONVERSATION_FIELDS.GROUP]: {
            type: groupSchema,
        },

        [CONVERSATION_FIELDS.LAST_MESSAGE]: {
            type: lastMessageSchema,
            default: null,
        },

        // List of { participantId: unreadMessageNumber }
        [CONVERSATION_FIELDS.UNREAD_COUNT]: {
            type: Map,
            of: Number,
            default: {},
        },
        [CONVERSATION_FIELDS.SEEN_BY]: [
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
conversationSchema.plugin(auditPlugin)
conversationSchema.plugin(softDeletePlugin)
conversationSchema.index({ "participants.userId": 1, "lastMessage.createdAt": -1 })
conversationSchema.index(
    {
        [CONVERSATION_FIELDS.TYPE]: 1,
        [DIRECT_CONVERSATION_FIELDS.USER_A]: 1,
        [DIRECT_CONVERSATION_FIELDS.USER_B]: 1,
    },
    {
        unique: true,
        name: FRIEND_INDEX_NAMES.ACTIVE_DIRECT_CONVERSATION_PAIR,
        partialFilterExpression: {
            [CONVERSATION_FIELDS.TYPE]: CONVERSATION_TYPE.DIRECT,
            [CONVERSATION_FIELDS.DEL_FLAG]: false,
            [DIRECT_CONVERSATION_FIELDS.USER_A]: { $exists: true },
            [DIRECT_CONVERSATION_FIELDS.USER_B]: { $exists: true },
        },
    },
)

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

/** Treat historical participants without a soft-delete marker as currently active. */
function isDeletedParticipant(participant: unknown): boolean {
    return typeof participant === "object" && participant !== null
        && PARTICIPANT_FIELDS.DEL_FLAG in participant
        && participant[PARTICIPANT_FIELDS.DEL_FLAG] === true
}

export default Conversation

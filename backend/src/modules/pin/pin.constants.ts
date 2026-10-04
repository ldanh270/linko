import { PIN_LIMITS } from "@linko/contracts"

/** Stable safe messages for pin access and visibility rules. */
export const PIN_ERROR_MESSAGES = {
    GROUP_NOT_FOUND: "Group not found",
    GROUP_ONLY: "Pinned messages are available only in group conversations",
    INSUFFICIENT_ROLE: "Only group owners and admins can manage pinned messages",
    MESSAGE_NOT_VISIBLE: "Pinned message was not found or is not visible",
    PIN_LIMIT: `A group can have at most ${PIN_LIMITS.MAX_PINNED_MESSAGES} pinned messages`,
} as const

/** Operation keys carried from pin controllers into domain use cases. */
export const PIN_OPERATION_FIELDS = {
    CONVERSATION_ID: "conversationId",
    MESSAGE_ID: "messageId",
    ACTOR_ID: "actorId",
    VIEWER_ID: "viewerId",
} as const

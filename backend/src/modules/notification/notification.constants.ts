/** Persistence and operation fields used by notification preference boundaries. */
export const NOTIFICATION_FIELDS = {
    CONVERSATION_ID: "conversationId",
    USER_ID: "userId",
    TYPE: "conversationType",
    IS_MUTED: "isMuted",
    MUTED_UNTIL: "mutedUntil",
} as const

/** Stable safe messages for notification preference rules. */
export const NOTIFICATION_ERROR_MESSAGES = {
    NOT_FOUND: "Conversation not found",
    GROUP_ONLY: "Notification preferences are available for groups only",
} as const

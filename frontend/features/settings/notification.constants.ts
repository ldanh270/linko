/** Browser route segments used to identify an open group chat for toast suppression. */
export const NOTIFICATION_CLIENT_PATHS = {
    GROUPS: "groups",
} as const

/** Browser routes that host a current group chat rather than group metadata. */
export const NOTIFICATION_CLIENT_PATTERNS = {
    CONVERSATION_ID: /^[a-f\d]{24}$/i,
} as const

/** Short user-facing in-app messages produced by the notification listener. */
export const NOTIFICATION_TOAST_MESSAGES = {
    NEW_MESSAGE: "Bạn có tin nhắn mới",
} as const

/** Resolve an open group-chat route to its conversation ID. */
export function getActiveGroupConversationId(pathname: string): string | null {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length !== 2 || segments[0] !== NOTIFICATION_CLIENT_PATHS.GROUPS) return null
    const conversationId = segments[1]
    return conversationId && NOTIFICATION_CLIENT_PATTERNS.CONVERSATION_ID.test(conversationId)
        ? conversationId
        : null
}

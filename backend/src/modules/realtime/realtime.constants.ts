/** Socket room names and safe membership event payload fields. */
export const REALTIME_FIELDS = {
    USER_ID: "userId",
    CONVERSATION_ID: "conversationId",
} as const

/** Stable room prefixes that prevent user and conversation room collisions. */
export const REALTIME_ROOM_PREFIXES = {
    USER: "user:",
    CONVERSATION: "conversation:",
} as const

/** MongoDB fields needed to validate socket authentication and room membership. */
export const REALTIME_MODEL_FIELDS = {
    ID: "_id",
    DEL_FLAG: "delFlag",
    PARTICIPANTS: "participants",
    PARTICIPANT_USER_ID: "userId",
    PARTICIPANT_DEL_FLAG: "delFlag",
    PARTICIPANT_LEFT_AT: "leftAt",
} as const

/** Construct one private room name for a user. */
export function userRoom(userId: string): string {
    return `${REALTIME_ROOM_PREFIXES.USER}${userId}`
}

/** Construct one conversation room name after membership validation. */
export function conversationRoom(conversationId: string): string {
    return `${REALTIME_ROOM_PREFIXES.CONVERSATION}${conversationId}`
}

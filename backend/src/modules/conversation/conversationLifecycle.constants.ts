/** Stable business messages used by group lifecycle rules. */
export const CONVERSATION_LIFECYCLE_MESSAGES = {
    NOT_FOUND: "Group not found",
    INSUFFICIENT_ROLE: "Only the active group owner can close the group",
    OWNER_TRANSFER_REQUIRED: "Transfer group ownership before leaving",
    MEMBERSHIP_CHANGED: "The group membership changed before this action could complete",
} as const

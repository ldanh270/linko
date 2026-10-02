import { GROUP_LIMITS } from "@linko/contracts"

/** Membership fields carried through service operations. */
export const MEMBERSHIP_OPERATION_FIELDS = {
    CONVERSATION_ID: "conversationId",
    ACTOR_ID: "actorId",
    TARGET_USER_ID: "targetUserId",
    NEW_OWNER_ID: "newOwnerId",
} as const

/** Stable outcome values used when invitation membership is added. */
export const MEMBERSHIP_ADD_OUTCOMES = {
    ADDED: "added",
    EXISTING: "existing",
    LIMIT: "limit",
    MISSING: "missing",
    STALE: "stale",
} as const

/** Stable safe messages emitted by group membership rules. */
export const MEMBERSHIP_MESSAGES = {
    NOT_FOUND: "Group or member not found",
    INSUFFICIENT_ROLE: "You do not have permission to manage this member",
    ROLE_UNCHANGED: "The member already has this role",
    INVALID_ROLE: "The requested group role is not valid",
    MEMBER_LIMIT: `A group cannot contain more than ${GROUP_LIMITS.MAX_MEMBERS_PER_GROUP} members`,
    OWNER_TRANSFER_CONFLICT: "The group changed before ownership could be transferred",
    MEMBERSHIP_CHANGED: "The group membership changed before this action could complete",
    INVALID_GROUP_RECORD: "Stored group conversation contains an invalid membership role",
} as const

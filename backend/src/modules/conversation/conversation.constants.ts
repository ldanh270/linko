import { GROUP_LIMITS } from "@linko/contracts"

/** MongoDB field names used by group conversation persistence queries. */
export const CONVERSATION_FIELDS = {
    ID: "_id",
    TYPE: "conversationType",
    STATUS: "status",
    PARTICIPANTS: "participants",
    GROUP: "group",
    LAST_MESSAGE: "lastMessage",
    UNREAD_COUNT: "unreadCount",
    SEEN_BY: "seenBy",
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
} as const

/** MongoDB participant field names shared by group filters and DTO mapping. */
export const PARTICIPANT_FIELDS = {
    USER_ID: "userId",
    NICKNAME: "nickname",
    ROLE: "role",
    IS_ARCHIVED: "isArchived",
    MUTED_UNTIL: "mutedUntil",
    CLEARED_HISTORY_AT: "clearedHistoryAt",
    JOINED_AT: "joinedAt",
    LEFT_AT: "leftAt",
    DEL_FLAG: "delFlag",
} as const

/** MongoDB fields stored in the last-message summary subdocument. */
export const LAST_MESSAGE_FIELDS = {
    MESSAGE_ID: "messageId",
    SENDER_ID: "senderId",
    CONTENT: "content",
    CREATED_AT: "createdAt",
} as const

/** MongoDB fields stored inside the group avatar subdocument. */
export const GROUP_AVATAR_FIELDS = {
    URL: "url",
    ID: "id",
} as const

/** Internal user fields used to atomically enforce a per-user group limit. */
export const GROUP_USER_FIELDS = {
    GROUP_CONVERSATION_COUNT: "groupConversationCount",
} as const

/** User profile fields included in safe conversation inbox summaries. */
export const CONVERSATION_USER_PROFILE_FIELDS = {
    ID: "_id",
    DISPLAY_NAME: "displayName",
    AVATAR: "avatar",
    AVATAR_URL: "url",
} as const

/** Internal group operation field names carried from controllers into services. */
export const CONVERSATION_OPERATION_FIELDS = {
    CONVERSATION_ID: "conversationId",
    ACTOR_ID: "actorId",
} as const

/** Stable safe messages emitted by group creation and management rules. */
export const GROUP_MESSAGES = {
    INVALID_NAME: `Group name must contain ${GROUP_LIMITS.MIN_NAME_LENGTH} to ${GROUP_LIMITS.MAX_NAME_LENGTH} characters`,
    INVALID_DESCRIPTION: `Group description must not exceed ${GROUP_LIMITS.MAX_DESCRIPTION_LENGTH} characters`,
    GROUP_LIMIT: `You can create up to ${GROUP_LIMITS.MAX_GROUPS_PER_USER} groups`,
    MEMBER_LIMIT: `A group cannot contain more than ${GROUP_LIMITS.MAX_MEMBERS_PER_GROUP} members`,
    OWNER_NOT_FOUND: "Group owner not found",
    NOT_FOUND: "Group not found",
    FORBIDDEN: "Only the group owner or an admin can update group details",
    EMPTY_UPDATE: "At least one group field must be provided",
    INVALID_AVATAR: "Group avatar must be a valid JPEG, PNG, or WebP image",
    AVATAR_TOO_LARGE: "Group avatar exceeds the upload size limit",
    AVATAR_CLEANUP_FAILED: "Failed to remove a group avatar after a database error",
    INVALID_RECORD: "Stored group conversation is missing required group details",
    CLOSED: "This group has been closed",
} as const


/** Event identifiers for safe operational group logs. */
export const GROUP_LOG_EVENTS = {
    AVATAR_CLEANUP_PENDING: "GROUP_AVATAR_CLEANUP_PENDING",
} as const

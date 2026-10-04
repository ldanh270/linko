/** MongoDB field names shared by friendship and friend request persistence. */
export const FRIENDSHIP_FIELDS = {
    USER_A: "userA",
    USER_B: "userB",
    DEL_FLAG: "delFlag",
} as const

/** MongoDB field names for directed pending friend requests. */
export const FRIEND_REQUEST_MODEL_FIELDS = {
    ID: "_id",
    FROM: "from",
    TO: "to",
    MESSAGE: "message",
    PAIR_USER_A: "pairUserA",
    PAIR_USER_B: "pairUserB",
    CREATED_AT: "createdAt",
    DEL_FLAG: "delFlag",
} as const

/** Public user fields selected by friend and search repositories. */
export const FRIEND_USER_FIELDS = {
    ID: "_id",
    USERNAME: "username",
    DISPLAY_NAME: "displayName",
    AVATAR: "avatar",
    AVATAR_URL: "url",
    BACKGROUND: "background",
    BACKGROUND_URL: "url",
    BIO: "bio",
} as const

/** Conversation fields used to find and uniquely index direct participant pairs. */
export const DIRECT_CONVERSATION_FIELDS = {
    USER_A: "directUserA",
    USER_B: "directUserB",
} as const

/** Stable business messages for friend requests and direct conversation access. */
export const FRIEND_ERROR_MESSAGES = {
    SELF_REQUEST: "You cannot send a friend request to yourself",
    USER_NOT_FOUND: "User not found",
    ALREADY_FRIENDS: "These users are already friends",
    REQUEST_PENDING: "A friend request is already pending",
    REQUEST_NOT_FOUND: "Friend request not found",
    REQUEST_FORBIDDEN: "Only the recipient can decide this friend request",
    FRIENDSHIP_NOT_FOUND: "Friendship not found",
    NOT_FRIENDS: "An active friendship is required to start a direct conversation",
    INVALID_RECORD: "Stored friend data is missing required fields",
} as const

/** Search limits prevent broad people searches from returning unbounded result sets. */
export const FRIEND_SEARCH_LIMITS = {
    TYPING: 5,
    FULL: 50,
    MIN_KEYWORD_LENGTH: 1,
    MAX_KEYWORD_LENGTH: 100,
} as const

/** Stable MongoDB names used for unique active friend-pair constraints. */
export const FRIEND_INDEX_NAMES = {
    ACTIVE_FRIENDSHIP: "active_friendship_unique",
    ACTIVE_FRIEND_REQUEST: "active_friend_request_unique",
    ACTIVE_FRIEND_REQUEST_PAIR: "active_friend_request_pair_unique",
    ACTIVE_DIRECT_CONVERSATION_PAIR: "active_direct_pair_unique",
} as const

/** Regular expression tokens escaped before public user search. */
export const FRIEND_SEARCH_PATTERNS = {
    REGEX_SPECIAL_CHARACTERS: /[.*+?^${}()|[\]\\]/g,
} as const

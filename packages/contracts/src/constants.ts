/** API route prefixes shared by server registration and clients. */
export const API_ROUTES = {
    AUTH: "/api/auth",
    CONVERSATIONS: "/api/conversations",
    MESSAGES: "/api/messages",
    USERS: "/api/users",
    FRIENDS: "/api/friends",
} as const

/** Route suffixes used by the auth API module and both HTTP clients. */
export const AUTH_ROUTE_PATHS = {
    SIGNUP: "/signup",
    LOGIN: "/login",
    REFRESH: "/refresh-token",
    LOGOUT: "/logout",
} as const

/** Stable error codes in API failure envelopes. */
export const ERROR_CODES = {
    INTERNAL: "INTERNAL",
    VALIDATION: "VALIDATION",
    MALFORMED_JSON: "MALFORMED_JSON",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    NOT_FOUND: "NOT_FOUND",
    CONFLICT: "CONFLICT",
    INVALID_TOKEN: "INVALID_TOKEN",
    USERNAME_TAKEN: "USERNAME_TAKEN",
    EMAIL_TAKEN: "EMAIL_TAKEN",
    INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
    INVALID_SESSION: "INVALID_SESSION",
    GROUP_LIMIT: "GROUP_LIMIT",
} as const

/** Conversation types stored by the persistence layer. */
export const CONVERSATION_TYPE = {
    DIRECT: "DIRECT",
    GROUP: "GROUP",
} as const

/** Conversation filter values accepted by list APIs. */
export const CONVERSATION_KIND = {
    GROUP: "group",
} as const

/** Query parameter names shared by conversation routes and clients. */
export const CONVERSATION_QUERY_PARAMS = {
    KIND: "kind",
} as const

/** Route parameter names shared by conversation handlers and schemas. */
export const CONVERSATION_PARAMS = {
    ID: "id",
} as const

/** Group DTO field names shared by the API, service mappers, and client. */
export const GROUP_FIELDS = {
    ID: "id",
    OWNER_ID: "ownerId",
    NAME: "name",
    DESCRIPTION: "description",
    AVATAR: "avatar",
    AVATAR_URL: "avatarUrl",
    PARTICIPANTS: "participants",
    USER_ID: "userId",
    ROLE: "role",
    MEMBER_COUNT: "memberCount",
    LAST_MESSAGE_AT: "lastMessageAt",
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
} as const

/** Group size and metadata limits defined by the Linko product contract. */
export const GROUP_LIMITS = {
    MAX_GROUPS_PER_USER: 100,
    MAX_MEMBERS_PER_GROUP: 100,
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 80,
    MAX_DESCRIPTION_LENGTH: 500,
} as const

/** Conversation route suffixes shared by route registration and API adapters. */
export const CONVERSATION_ROUTE_PATHS = {
    ROOT: "/",
    BY_ID: `/:${CONVERSATION_PARAMS.ID}`,
} as const

/** Group and direct conversation roles stored as text. */
export const ROLE = {
    OWNER: "OWNER",
    ADMIN: "ADMIN",
    MEMBER: "MEMBER",
    DIRECT: "DIRECT",
} as const

/** Socket event names shared by gateway and client listeners. */
export const SOCKET_EVENTS = {
    MESSAGE_CREATED: "message:created",
    CONVERSATION_UPDATED: "conversation:updated",
    MEMBERSHIP_CHANGED: "membership:changed",
} as const

/** One stable error code from the shared contract. */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

/** One persisted conversation role. */
export type Role = (typeof ROLE)[keyof typeof ROLE]

/** One persisted conversation type. */
export type ConversationType = (typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE]

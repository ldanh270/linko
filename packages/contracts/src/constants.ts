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

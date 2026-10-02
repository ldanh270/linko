/** API route prefixes shared by server registration and clients. */
export const API_ROUTES = {
    AUTH: "/api/auth",
    CONVERSATIONS: "/api/conversations",
    INVITATIONS: "/api/invitations",
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
    INVITATION_UNAVAILABLE: "INVITATION_UNAVAILABLE",
    INVITATION_REQUEST_REPLAYED: "INVITATION_REQUEST_REPLAYED",
    INVITATION_RATE_LIMITED: "INVITATION_RATE_LIMITED",
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

/** Invitation request paths shared by conversation routes and API adapters. */
export const INVITATION_PARAMS = {
    CONVERSATION_ID: CONVERSATION_PARAMS.ID,
    INVITATION_ID: "invitationId",
    TOKEN: "token",
} as const

/** HTTP headers shared by invitation issue clients and server validation. */
export const INVITATION_HEADERS = {
    IDEMPOTENCY_KEY: "idempotency-key",
} as const

/** Invitation route suffixes mounted below the conversation API prefix. */
export const INVITATION_ROUTE_PATHS = {
    COLLECTION: `/:${INVITATION_PARAMS.CONVERSATION_ID}/invitations`,
    BY_ID: `/:${INVITATION_PARAMS.CONVERSATION_ID}/invitations/:${INVITATION_PARAMS.INVITATION_ID}`,
} as const

/** Public, unauthenticated invitation preview path. */
export const INVITATION_PREVIEW_ROUTE_PATHS = {
    PREVIEW: `/:${INVITATION_PARAMS.TOKEN}/preview`,
} as const

/** Browser route prefix for a one-time invitation URL. */
export const INVITATION_LINK_PATH = "/invite"

const INVITATION_TOKEN_BYTES = 32
const INVITATION_TOKEN_CHARACTER_CLASS = "[A-Za-z0-9_-]"

/** Invitation limits shared by issuance, persistence, and API clients. */
export const INVITATION_LIMITS = {
    TOKEN_BYTES: INVITATION_TOKEN_BYTES,
    TOKEN_LENGTH: Math.ceil((INVITATION_TOKEN_BYTES * 8) / 6),
    TOKEN_HASH_LENGTH: 64,
    LIFETIME_MS: 7 * 24 * 60 * 60 * 1000,
    MAX_USES: 25,
} as const

/** Invitation token syntax shared by public route validation and log redaction. */
export const INVITATION_PATTERNS = {
    TOKEN: new RegExp(`^${INVITATION_TOKEN_CHARACTER_CLASS}{${INVITATION_LIMITS.TOKEN_LENGTH}}$`),
} as const

/** Character class shared by invitation token validation and secret redaction. */
export const INVITATION_TOKEN_CHARACTERS = INVITATION_TOKEN_CHARACTER_CLASS

/** Public invitation DTO field names shared by backend mappers and clients. */
export const INVITATION_FIELDS = {
    ID: "id",
    URL: "url",
    EXPIRES_AT: "expiresAt",
    MAX_USES: "maxUses",
    USE_COUNT: "useCount",
    REVOKED_AT: "revokedAt",
    CREATED_AT: "createdAt",
} as const

/** Minimal public fields rendered by the unauthenticated invitation preview. */
export const INVITATION_PREVIEW_FIELDS = {
    GROUP_NAME: "groupName",
    GROUP_DESCRIPTION: "groupDescription",
    GROUP_AVATAR_URL: "groupAvatarUrl",
    MEMBER_COUNT: "memberCount",
    EXPIRES_AT: INVITATION_FIELDS.EXPIRES_AT,
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

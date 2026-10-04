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
    INSUFFICIENT_ROLE: "INSUFFICIENT_ROLE",
    OWNER_TRANSFER_REQUIRED: "OWNER_TRANSFER_REQUIRED",
    GROUP_CLOSED: "GROUP_CLOSED",
    FRIENDSHIP_REQUIRED: "FRIENDSHIP_REQUIRED",
    INVALID_REPLY: "INVALID_REPLY",
} as const

/** Conversation types stored by the persistence layer. */
export const CONVERSATION_TYPE = {
    DIRECT: "DIRECT",
    GROUP: "GROUP",
} as const

/** Lifecycle states shared by group and conversation APIs. */
export const CONVERSATION_STATUS = {
    ACTIVE: "ACTIVE",
    CLOSED: "CLOSED",
} as const

/** Conversation filter values accepted by list APIs. */
export const CONVERSATION_KIND = {
    ALL: "all",
    GROUP: "group",
    DIRECT: "direct",
} as const

/** Conversation kind values accepted by the inbox filter. */
export type ConversationKind = (typeof CONVERSATION_KIND)[keyof typeof CONVERSATION_KIND]

/** Query parameter names shared by conversation routes and clients. */
export const CONVERSATION_QUERY_PARAMS = {
    KIND: "kind",
    CURSOR: "cursor",
    LIMIT: "limit",
} as const

/** Inbox fields shared by cursor-page DTOs and feature adapters. */
export const INBOX_FIELDS = {
    ID: "id",
    TYPE: "type",
    PARTICIPANTS: "participants",
    UNREAD_COUNT: "unreadCount",
    LAST_MESSAGE: "lastMessage",
    GROUP: "group",
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
} as const

/** Participant profile fields returned in an inbox row. */
export const INBOX_PARTICIPANT_FIELDS = {
    ID: INBOX_FIELDS.ID,
    DISPLAY_NAME: "displayName",
    AVATAR_URL: "avatarUrl",
    JOINED_AT: "joinedAt",
} as const

/** Last-message preview fields returned in an inbox row. */
export const INBOX_MESSAGE_FIELDS = {
    SENDER: "sender",
} as const

/** Bounds applied by the inbox cursor API and service. */
export const INBOX_LIMITS = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 50,
    MAX_CURSOR_LENGTH: 256,
} as const

/** Generic fields shared by every stable cursor-page API response. */
export const CURSOR_PAGE_FIELDS = {
    ITEMS: "items",
    NEXT_CURSOR: "nextCursor",
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
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
} as const

/** DTO field names shared by conversation and group lifecycle responses. */
export const CONVERSATION_DTO_FIELDS = {
    STATUS: "status",
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
    LEAVE: `/:${CONVERSATION_PARAMS.ID}/leave`,
    CLOSE: `/:${CONVERSATION_PARAMS.ID}/close`,
    READ: `/:${CONVERSATION_PARAMS.ID}/read`,
} as const

/** Read-state DTO field names shared by conversation routes and API adapters. */
export const READ_FIELDS = {
    CONVERSATION_ID: "conversationId",
    LAST_READ_AT: "lastReadAt",
    LAST_READ_MESSAGE_ID: "lastReadMessageId",
    UNREAD_COUNT: "unreadCount",
} as const

/** Request field names shared by read-state validation and clients. */
export const READ_REQUEST_FIELDS = {
    LAST_VISIBLE_MESSAGE_ID: "lastVisibleMessageId",
} as const

/** Message route parameter names shared by validation, controllers, and clients. */
export const MESSAGE_PARAMS = {
    CONVERSATION_ID: "conversationId",
} as const

/** Message list query parameters shared by validation and API adapters. */
export const MESSAGE_QUERY_PARAMS = {
    CURSOR: "cursor",
    LIMIT: "limit",
} as const

/** Public message DTO and request field names shared across API boundaries. */
export const MESSAGE_FIELDS = {
    ID: "id",
    CONVERSATION_ID: "conversationId",
    SENDER_ID: "senderId",
    CLIENT_MESSAGE_ID: "clientMessageId",
    CONTENT: "content",
    REPLY_TO: "replyTo",
    MENTIONS: "mentions",
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
} as const

/** Message API route suffixes mounted below `/api/messages`. */
export const MESSAGE_ROUTE_PATHS = {
    ROOT: "/",
    BY_CONVERSATION: `/:${MESSAGE_PARAMS.CONVERSATION_ID}`,
} as const

/** Message validation and pagination limits shared by server and clients. */
export const MESSAGE_LIMITS = {
    MAX_CONTENT_LENGTH: 4000,
    CLIENT_MESSAGE_ID_LENGTH: 128,
    MAX_MENTIONS: 20,
    DEFAULT_PAGE_SIZE: 30,
    MAX_PAGE_SIZE: 100,
    MAX_CURSOR_LENGTH: 256,
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

/** Token-scoped invitation preview and acceptance paths. */
export const INVITATION_PREVIEW_ROUTE_PATHS = {
    PREVIEW: `/:${INVITATION_PARAMS.TOKEN}/preview`,
    ACCEPT: `/:${INVITATION_PARAMS.TOKEN}/accept`,
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

/** Group roles allowed on a membership record. */
export type GroupMemberRole = Exclude<Role, typeof ROLE.DIRECT>

/** One persisted conversation type. */
export type ConversationType = (typeof CONVERSATION_TYPE)[keyof typeof CONVERSATION_TYPE]
export type ConversationStatus = (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS]

import { INVITATION_LIMITS } from "@linko/contracts"

/** MongoDB field names used by invitation persistence and repository queries. */
export const INVITATION_MODEL_FIELDS = {
    ID: "_id",
    CONVERSATION_ID: "conversationId",
    TOKEN_HASH: "tokenHash",
    IDEMPOTENCY_KEY_HASH: "idempotencyKeyHash",
    EXPIRES_AT: "expiresAt",
    MAX_USES: "maxUses",
    USE_COUNT: "useCount",
    REVOKED_AT: "revokedAt",
    DEL_FLAG: "delFlag",
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
} as const

/** Stable safe messages used by invitation business rules. */
export const INVITATION_MESSAGES = {
    GROUP_NOT_FOUND: "Group not found",
    FORBIDDEN: "Only the group owner or an admin can manage invitations",
    NOT_FOUND: "Invitation not found",
    ACTIVE_CONFLICT: "A current invitation could not be replaced; retry the request",
    INVALID_INSERT: "Invitation insert returned no record",
    UNAVAILABLE: "This invitation is no longer available",
    REQUEST_REPLAYED: "This invitation request was already processed; use a new request key to issue another link",
    RATE_LIMITED: "Too many invitation links have been issued; try again later",
    IDEMPOTENCY_KEY_REQUIRED: "An idempotency key is required to issue an invitation",
} as const

/** Per-process issue-attempt budget enforced at the authenticated route boundary. */
export const INVITATION_RATE_LIMITS = {
    MAX_ISSUES: 5,
    WINDOW_MS: 60 * 60 * 1000,
} as const

/** Shared persistence values used when validating invitation records. */
export const INVITATION_PERSISTENCE_LIMITS = {
    HASH_LENGTH: INVITATION_LIMITS.TOKEN_HASH_LENGTH,
    EXPIRATION_MS: INVITATION_LIMITS.LIFETIME_MS,
} as const

/** Input patterns for values that cross the invitation persistence boundary. */
export const INVITATION_PERSISTENCE_PATTERNS = {
    TOKEN_HASH: new RegExp(`^[a-f0-9]{${INVITATION_PERSISTENCE_LIMITS.HASH_LENGTH}}$`),
    IDEMPOTENCY_KEY_HASH: new RegExp(`^[a-f0-9]{${INVITATION_PERSISTENCE_LIMITS.HASH_LENGTH}}$`),
} as const

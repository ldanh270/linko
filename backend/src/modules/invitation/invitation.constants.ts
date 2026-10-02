import { INVITATION_LIMITS } from "@linko/contracts"

/** MongoDB field names used by invitation persistence and repository queries. */
export const INVITATION_MODEL_FIELDS = {
    ID: "_id",
    CONVERSATION_ID: "conversationId",
    TOKEN_HASH: "tokenHash",
    EXPIRES_AT: "expiresAt",
    MAX_USES: "maxUses",
    USE_COUNT: "useCount",
    REVOKED_AT: "revokedAt",
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
} as const

/** Shared persistence values used when validating invitation records. */
export const INVITATION_PERSISTENCE_LIMITS = {
    HASH_LENGTH: INVITATION_LIMITS.TOKEN_HASH_LENGTH,
    EXPIRATION_MS: INVITATION_LIMITS.LIFETIME_MS,
} as const

/** Input patterns for values that cross the invitation persistence boundary. */
export const INVITATION_PERSISTENCE_PATTERNS = {
    TOKEN_HASH: new RegExp(`^[a-f0-9]{${INVITATION_PERSISTENCE_LIMITS.HASH_LENGTH}}$`),
} as const

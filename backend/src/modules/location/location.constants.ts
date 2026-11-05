/** Live-location field names shared by its schema and storage adapter. */
export const LOCATION_FIELDS = {
    ID: "_id", CONVERSATION_ID: "conversationId", MESSAGE_ID: "messageId", CREATOR_ID: "creatorId", CLIENT_ID: "clientMessageId", PUBLISHER_ID: "publisherId",
    LATITUDE: "latitude", LONGITUDE: "longitude", ACCURACY: "accuracy", LAST_FIX_AT: "lastFixAt", SEQUENCE: "sequence", EXPIRES_AT: "expiresAt",
    ENDED_AT: "endedAt", STATUS: "status", REVISION: "revision", CREATED_AT: "createdAt", DELETED: "delFlag",
} as const
/** Business failures returned without logging precise location data. */
export const LOCATION_ERRORS = {
    NOT_FOUND: "Location share not found", OWNER: "Only the person sharing can update or stop this share", ENDED: "This location share has ended",
    ACTIVE: "Stop your existing location share before starting another", STALE_FIX: "This location update is old or too frequent", PUBLISHER: "Resume sharing from the original publishing tab",
    IDEMPOTENCY: "This command was already used for another message",
    PREVIEW: "Chia sẻ vị trí trực tiếp",
} as const
/** Storage index names keep live session lookup and cleanup predictable. */
export const LOCATION_INDEXES = { CONVERSATION: "location_conversation_created", ACTIVE: "location_active_creator_unique", MESSAGE: "location_message_unique", COMMAND: "location_creator_command_unique", EXPIRY: "location_status_expiry", CREATOR: "location_creator" } as const
/** Foreground location storage/cadence bounds not chosen by a caller. */
export const LOCATION_BOUNDS = { LATITUDE: 90, LONGITUDE: 180, ACCURACY_METERS: 100000, TOKEN_LENGTH: 128, MIN_TOKEN_LENGTH: 8, MINUTE_MS: 60000, CLEANUP_BATCH: 100 } as const

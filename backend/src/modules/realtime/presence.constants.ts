/** Versioned keys avoid inheriting unleased bits from the legacy bitmap. */
export const PRESENCE_KEYS = {
    PREFIX: "linko:presence:v2:", BITMAP: "bitmap", OFFSETS: "offsets", COUNTER: "counter", DEADLINES: "deadlines", SESSIONS: "sessions:",
} as const

/** Lease cadence bounds stale online time after an ungraceful exit. */
export const PRESENCE_TIMING = { HEARTBEAT_MS: 15000, LEASE_MS: 45000, CLEANUP_BATCH: 200 } as const

/** Presence fields reused across persistence and query boundaries. */
export const PRESENCE_FIELDS = { LAST_ACTIVE: "lastActive", IDS: "ids" } as const

/** Technical diagnostics contain no connection credentials. */
export const PRESENCE_MESSAGES = {
    PIPELINE_FAILED: "Presence pipeline did not complete",
    REDIS_UNAVAILABLE: "Redis presence unavailable; using process-local presence",
    REDIS_MISSING: "Redis presence is not configured; using process-local presence",
} as const

/** Notification policy limits and browser asset names. */
export const NOTIFICATION_DELIVERY = { MAX_SEEN_IDS: 500, MAX_PREVIEW_LENGTH: 140, ICON: "/favicon.ico" } as const

/** Browser permissions are evaluated live and requested only from a user gesture. */
export const NOTIFICATION_PERMISSION = { DEFAULT: "default", GRANTED: "granted", DENIED: "denied" } as const

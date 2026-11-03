/** Shared typing cadence keeps sender refreshes shorter than receiver expiry. */
export const TYPING_TIMING = { REFRESH_MS: 1000, IDLE_MS: 2500, EXPIRY_MS: 3500 } as const

/** Socket lifecycle events used for clearing transient client state. */
export const SOCKET_LIFECYCLE = { DISCONNECT: "disconnect" } as const

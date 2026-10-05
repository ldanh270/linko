/** Browser route used after auth bootstrap cannot restore a valid session. */
export const AUTH_CLIENT_ROUTES = {
    LOGIN: "/login",
} as const

/** Safe navigation query names used to resume an interrupted account flow. */
export const AUTH_QUERY_PARAMS = { NEXT: "next", REGISTERED: "registered" } as const

/** Window event raised when a protected API request cannot renew its session. */
export const AUTH_CLIENT_EVENTS = {
    SESSION_EXPIRED: "linko:session-expired",
} as const

/** Session states used by the hook and protected app shell. */
export const AUTH_SESSION_STATUS = {
    LOADING: "loading",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
} as const

/** Accessible status copy shown while the client resolves authentication. */
export const AUTH_STATUS_MESSAGES = {
    LOADING: "Checking your session…",
    UNAUTHENTICATED: "Redirecting to sign in…",
} as const

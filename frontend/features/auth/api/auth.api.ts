import { API_ROUTES, AUTH_ROUTE_PATHS, type AuthAccessTokenDto, type LoginInput, type SignupInput, type UserDto } from "@linko/contracts"

import { ApiClient } from "@/shared/http/client"
import { AUTH_CLIENT_EVENTS } from "../auth.constants"

/** Auth URLs derived from the shared API prefix and route contract. */
const AUTH_ENDPOINTS = {
    SIGNUP: `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.SIGNUP}`,
    LOGIN: `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`,
    REFRESH: `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`,
    LOGOUT: `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGOUT}`,
} as const

let accessToken: string | null = null
let refreshInFlight: Promise<AuthAccessTokenDto> | null = null

const authApiClient = new ApiClient()

/** Use shared auth transport with an in-memory access token and single-flight refresh. */
export const authenticatedApiClient = new ApiClient("", getAuthorizationHeaders, recoverUnauthorizedRequest)

/** Register an account and return its safe public DTO. */
export function signup(input: SignupInput): Promise<UserDto> {
    return authApiClient.request({ path: AUTH_ENDPOINTS.SIGNUP, method: "POST", body: input })
}

/** Authenticate credentials and keep the short-lived token in memory only. */
export async function login(input: LoginInput): Promise<AuthAccessTokenDto> {
    accessToken = null
    const tokens = await authApiClient.request<AuthAccessTokenDto>({
        path: AUTH_ENDPOINTS.LOGIN,
        method: "POST",
        body: input,
    })
    accessToken = tokens.accessToken
    return tokens
}

/** Restore or rotate the cookie-backed session, sharing concurrent refreshes. */
export function refreshSession(): Promise<AuthAccessTokenDto> {
    if (refreshInFlight) return refreshInFlight

    refreshInFlight = authApiClient.request<AuthAccessTokenDto>({
        path: AUTH_ENDPOINTS.REFRESH,
        method: "POST",
    }).then((tokens) => {
        accessToken = tokens.accessToken
        refreshInFlight = null
        return tokens
    }, (error: unknown) => {
        accessToken = null
        refreshInFlight = null
        throw error
    })
    return refreshInFlight
}

/** Revoke the cookie-backed session and clear the in-memory access token. */
export async function logout(): Promise<void> {
    try {
        await authApiClient.request<null>({ path: AUTH_ENDPOINTS.LOGOUT, method: "POST" })
    } finally {
        accessToken = null
    }
}

/** Read the short-lived in-memory access token for authenticated socket handshakes. */
export function getAccessToken(): string | null {
    return accessToken
}

/** Return the current bearer token without persisting it outside JavaScript memory. */
function getAuthorizationHeaders(): HeadersInit | undefined {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
}

/** Refresh once after a protected request fails and notify mounted session hooks on failure. */
async function recoverUnauthorizedRequest(): Promise<boolean> {
    try {
        await refreshSession()
        return true
    } catch {
        notifySessionExpired()
        return false
    }
}

/** Tell mounted session hooks that an API request could not restore the session. */
function notifySessionExpired(): void {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_CLIENT_EVENTS.SESSION_EXPIRED))
    }
}

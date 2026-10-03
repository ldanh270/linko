/** Database and token field names used across the auth persistence boundary. */
export const AUTH_FIELDS = {
    ID: "id",
    USER_ID: "userId",
    PASSWORD: "password",
    USERNAME: "username",
    EMAIL: "email",
    DISPLAY_NAME: "displayName",
    HASHED_PASSWORD: "hashedPassword",
    REFRESH_TOKEN: "refreshToken",
    REFRESH_TOKEN_HASH: "refreshTokenHash",
    EXPIRES_AT: "expiresAt",
    DELETED: "delFlag",
    UPDATED_AT: "updatedAt",
    UPDATED_BY: "updatedBy",
    UPDATED_IP: "updatedIp",
} as const

/** Stable MongoDB index names owned by the auth persistence layer. */
export const AUTH_INDEX_NAMES = {
    REFRESH_TOKEN_HASH: "active_refresh_token_hash_unique",
} as const

/** Route suffixes mounted beneath the shared authentication API prefix. */
export const AUTH_ROUTE_PATHS = {
    SIGNUP: "/signup",
    LOGIN: "/login",
    REFRESH: "/refresh-token",
    LOGOUT: "/logout",
} as const

/** Cookie name shared by login, refresh, and logout. */
export const AUTH_COOKIE_NAME = "refreshToken"

/** Stable, safe messages for expected authentication failures. */
export const AUTH_MESSAGES = {
    USERNAME_TAKEN: "Username already in use",
    EMAIL_TAKEN: "Email already in use",
    ACCOUNT_TAKEN: "Account already exists",
    INVALID_CREDENTIALS: "Username or password is incorrect",
    INVALID_SESSION: "Refresh session is invalid or expired",
} as const

/** Boundary validation messages retained for consistent schema feedback. */
export const AUTH_VALIDATION_MESSAGES = {
    USERNAME_TOO_SHORT: "Username must have at least 3 characters",
    USERNAME_TOO_LONG: "Username must not exceed 30 characters",
    USERNAME_FORMAT: "Username may contain lowercase letters, numbers, underscores, and dots",
    PASSWORD_POLICY: "Password must contain uppercase, lowercase, number, and special characters",
    DISPLAY_NAME_REQUIRED: "Display name cannot be empty",
    EMAIL_INVALID: "Invalid email address",
    USERNAME_REQUIRED: "Username cannot be empty",
    PASSWORD_REQUIRED: "Password cannot be empty",
} as const

/** Token lifetimes and cryptographic parameters used by the auth module. */
export const AUTH_SECURITY = {
    PASSWORD_HASH_COST: 12,
    REFRESH_TOKEN_BYTES: 64,
    REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
    ACCESS_TOKEN_TTL: "15m",
    ACCESS_TOKEN_ISSUER: "linko-api",
    ACCESS_TOKEN_AUDIENCE: "linko-web",
    HASH_ALGORITHM: "sha256",
} as const

/** Environment variable names read by the auth configuration boundary. */
export const AUTH_ENV_KEYS = {
    ACCESS_TOKEN_SECRET: "ACCESS_TOKEN_SECRET",
    CLIENT_ORIGIN: "CLIENT_URL",
    COOKIE_SECURE: "AUTH_COOKIE_SECURE",
    COOKIE_SAME_SITE: "AUTH_COOKIE_SAME_SITE",
} as const

/** Safe startup validation messages for authentication-related configuration. */
export const AUTH_CONFIG_MESSAGES = {
    COOKIE_SAME_SITE_REQUIRES_SECURE: "SameSite=None requires secure refresh cookies",
} as const

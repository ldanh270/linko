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
} as const

/** Stable, safe messages for expected authentication failures. */
export const AUTH_MESSAGES = {
    USERNAME_TAKEN: "Username already in use",
    EMAIL_TAKEN: "Email already in use",
    ACCOUNT_TAKEN: "Account already exists",
    INVALID_CREDENTIALS: "Username or password is incorrect",
    INVALID_SESSION: "Refresh session is invalid or expired",
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
    FRONTEND_ORIGIN: "FRONTEND_ORIGIN",
    COOKIE_SECURE: "AUTH_COOKIE_SECURE",
    COOKIE_SAME_SITE: "AUTH_COOKIE_SAME_SITE",
} as const

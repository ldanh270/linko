import zod from "zod"

import { AUTH_CONFIG_MESSAGES, AUTH_ENV_KEYS } from "../modules/auth/auth.constants"
import type { AuthCookieConfiguration } from "../modules/auth/auth.types"

const authEnvironmentSchema = zod.object({
    [AUTH_ENV_KEYS.ACCESS_TOKEN_SECRET]: zod.string().min(32),
    [AUTH_ENV_KEYS.CLIENT_ORIGIN]: zod.string().url(),
    [AUTH_ENV_KEYS.COOKIE_SECURE]: zod.enum(["true", "false"]).default("false"),
    [AUTH_ENV_KEYS.COOKIE_SAME_SITE]: zod.enum(["lax", "strict", "none"]).default("lax"),
}).superRefine((environment, context) => {
    if (environment[AUTH_ENV_KEYS.COOKIE_SAME_SITE] === "none" &&
        environment[AUTH_ENV_KEYS.COOKIE_SECURE] !== "true") {
        context.addIssue({
            code: "custom",
            message: AUTH_CONFIG_MESSAGES.COOKIE_SAME_SITE_REQUIRES_SECURE,
            path: [AUTH_ENV_KEYS.COOKIE_SECURE],
        })
    }
})

/** Auth settings validated once before the HTTP server starts. */
export interface AuthRuntimeConfig {
    readonly accessTokenSecret: string
    readonly clientOrigin: string
    readonly refreshCookie: AuthCookieConfiguration
}

/** Validate auth secrets, CORS origin, and cookie policy for the current environment. */
export function loadAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthRuntimeConfig {
    const parsed = authEnvironmentSchema.parse(environment)
    return {
        accessTokenSecret: parsed[AUTH_ENV_KEYS.ACCESS_TOKEN_SECRET],
        clientOrigin: parsed[AUTH_ENV_KEYS.CLIENT_ORIGIN],
        refreshCookie: {
            path: "/",
            secure: parsed[AUTH_ENV_KEYS.COOKIE_SECURE] === "true",
            sameSite: parsed[AUTH_ENV_KEYS.COOKIE_SAME_SITE],
        },
    }
}

import zod from "zod"

import { REGEX } from "../../configs/constants/regex"
import { AUTH_COOKIE_NAME, AUTH_FIELDS, AUTH_VALIDATION_MESSAGES } from "./auth.constants"

/** Signup body validation shared by the auth route boundary. */
export const signupSchema = zod.object({
    body: zod.object({
        [AUTH_FIELDS.USERNAME]: zod.string()
            .trim()
            .toLowerCase()
            .min(3, AUTH_VALIDATION_MESSAGES.USERNAME_TOO_SHORT)
            .max(30, AUTH_VALIDATION_MESSAGES.USERNAME_TOO_LONG)
            .regex(REGEX.USERNAME, AUTH_VALIDATION_MESSAGES.USERNAME_FORMAT),
        [AUTH_FIELDS.PASSWORD]: zod.string().regex(REGEX.PASSWORD, AUTH_VALIDATION_MESSAGES.PASSWORD_POLICY),
        [AUTH_FIELDS.DISPLAY_NAME]: zod.string().trim().min(1, AUTH_VALIDATION_MESSAGES.DISPLAY_NAME_REQUIRED),
        [AUTH_FIELDS.EMAIL]: zod.string()
            .trim()
            .toLowerCase()
            .pipe(zod.email(AUTH_VALIDATION_MESSAGES.EMAIL_INVALID)),
    }),
})

/** Login body validation shared by the auth route boundary. */
export const loginSchema = zod.object({
    body: zod.object({
        [AUTH_FIELDS.USERNAME]: zod.string().trim().toLowerCase().min(1, AUTH_VALIDATION_MESSAGES.USERNAME_REQUIRED),
        [AUTH_FIELDS.PASSWORD]: zod.string().min(1, AUTH_VALIDATION_MESSAGES.PASSWORD_REQUIRED),
    }),
})

/** Optional refresh cookie validation; missing credentials map to a business 401 in the controller. */
export const refreshCookieSchema = zod.object({
    cookies: zod.object({ [AUTH_COOKIE_NAME]: zod.string().optional() }).passthrough(),
})

/** Optional logout cookie validation to keep logout idempotent when the cookie has expired. */
export const logoutCookieSchema = refreshCookieSchema

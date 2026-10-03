import { describe, expect, it } from "vitest"

import { AUTH_ENV_KEYS } from "../modules/auth/auth.constants"
import { loadAuthConfig } from "./auth.config"

describe("auth configuration", () => {
    it("rejects SameSite=None when Secure cookies are disabled", () => {
        expect(() => loadAuthConfig({
            [AUTH_ENV_KEYS.ACCESS_TOKEN_SECRET]: "test-secret-with-enough-entropy-for-linko-auth",
            [AUTH_ENV_KEYS.CLIENT_ORIGIN]: "https://app.example",
            [AUTH_ENV_KEYS.COOKIE_SECURE]: "false",
            [AUTH_ENV_KEYS.COOKIE_SAME_SITE]: "none",
        })).toThrow()
    })
})

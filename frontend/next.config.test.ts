import { describe, expect, it } from "vitest"

import nextConfig from "./next.config"

describe("invitation page response headers", () => {
    it("should_prevent_token_referrers_and_cache_storage", async () => {
        const rules = await nextConfig.headers?.() ?? []
        const invitationRule = rules.find(({ source }) => source === "/invite/:token")

        expect(invitationRule?.headers).toEqual(expect.arrayContaining([
            { key: "Referrer-Policy", value: "no-referrer" },
            { key: "Cache-Control", value: "no-store" },
        ]))
    })
})

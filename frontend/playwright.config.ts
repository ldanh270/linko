import { defineConfig, devices } from "@playwright/test"

/** Exercise the responsive app shell with a local Next.js server. */
export default defineConfig({
    testDir: "./test/e2e",
    workers: 1,
    use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100", ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL, timezoneId: "Asia/Ho_Chi_Minh" },
    webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
        command: "pnpm exec next dev -p 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: !process.env.CI,
    },
})

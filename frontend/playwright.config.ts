import { defineConfig, devices } from "@playwright/test"

/** Exercise the responsive app shell with a local Next.js server. */
export default defineConfig({
    testDir: "./test/e2e",
    use: { baseURL: "http://127.0.0.1:3100", ...devices["Desktop Chrome"] },
    webServer: {
        command: "pnpm exec next dev -p 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: !process.env.CI,
    },
})

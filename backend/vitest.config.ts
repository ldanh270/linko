import { defineConfig } from "vitest/config"

/** Keep backend tests isolated from developer MongoDB configuration. */
export default defineConfig({
    test: {
        setupFiles: ["./test/setup.ts"],
        testTimeout: 30_000,
        hookTimeout: 60_000,
        exclude: ["node_modules", "dist"],
    },
})

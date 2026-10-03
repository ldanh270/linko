import { defineConfig } from "vitest/config"

/** Run shared UI tests in a browser-like DOM. */
export default defineConfig({
    test: {
        environment: "jsdom",
        setupFiles: ["./test/setup.ts"],
        exclude: ["node_modules", ".next"],
    },
})

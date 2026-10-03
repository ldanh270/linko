import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

/** Run shared UI tests in a browser-like DOM. */
export default defineConfig({
    resolve: {
        alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./test/setup.ts"],
        exclude: ["**/node_modules/**", "**/.next/**", "test/e2e/**", "test-results/**"],
    },
})

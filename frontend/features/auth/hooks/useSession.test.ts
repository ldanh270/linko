import { API_ROUTES, AUTH_ROUTE_PATHS } from "@linko/contracts"
import type { ReactNode } from "react"
import { createElement } from "react"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AUTH_CLIENT_ROUTES } from "../auth.constants"

const { replaceRoute, router } = vi.hoisted(() => {
    const replaceRoute = vi.fn()
    return { replaceRoute, router: { replace: replaceRoute } }
})

vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("@/features/settings/components/NotificationToastsListener", () => ({
    NotificationToastsListener: () => null,
}))
vi.mock("@/shared/layout/AppShell", () => ({
    AppShell: ({ children }: { children: ReactNode }) => children,
}))

/** Build one API success response for session tests. */
function successResponse(data: unknown): Response {
    return new Response(JSON.stringify({ success: true, data, error: null, meta: null }), { status: 200 })
}

/** Build a safe unauthorized response for session tests. */
function unauthorizedResponse(): Response {
    return new Response(JSON.stringify({
        success: false,
        data: null,
        error: { code: "INVALID_SESSION", message: "Session expired" },
        meta: null,
    }), { status: 401 })
}

beforeEach(() => {
    vi.resetModules()
    replaceRoute.mockReset()
})
afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
})

describe("useSession", () => {
    it("clears an expired access token and redirects when refresh fails", async () => {
        const { render, screen, waitFor } = await import("@testing-library/react")
        const refreshHeaders: Headers[] = []
        const protectedHeaders: Headers[] = []
        const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
            const url = String(input)
            const headers = new Headers(options?.headers)
            if (url === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`) return successResponse({ accessToken: "stale-access-token" })
            if (url === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`) {
                refreshHeaders.push(headers)
                return unauthorizedResponse()
            }
            protectedHeaders.push(headers)
            return unauthorizedResponse()
        })
        vi.stubGlobal("fetch", fetchMock)
        const authApi = await import("../api/auth.api")
        await authApi.login({ username: "reader", password: "ValidPass1!" })
        const { ProtectedAppShell } = await import("../components/ProtectedAppShell")

        render(createElement(ProtectedAppShell, null, createElement("p", null, "private conversation")))

        expect(screen.queryByText("private conversation")).not.toBeInTheDocument()
        await waitFor(() => expect(replaceRoute).toHaveBeenCalledWith(AUTH_CLIENT_ROUTES.LOGIN))
        expect(screen.queryByText("private conversation")).not.toBeInTheDocument()

        await expect(authApi.authenticatedApiClient.request({ path: API_ROUTES.CONVERSATIONS })).rejects.toMatchObject({ status: 401 })
        expect(refreshHeaders).toHaveLength(2)
        expect(protectedHeaders).toHaveLength(1)
        expect(protectedHeaders[0].has("Authorization")).toBe(false)
    })

    it("keeps protected content hidden until the refresh cookie is validated", async () => {
        let releaseRefresh: (response: Response) => void = () => undefined
        const waitingRefresh = new Promise<Response>((resolve) => { releaseRefresh = resolve })
        vi.stubGlobal("fetch", vi.fn(async () => waitingRefresh))
        const { render, screen } = await import("@testing-library/react")
        const { ProtectedAppShell } = await import("../components/ProtectedAppShell")

        render(createElement(ProtectedAppShell, null, createElement("p", null, "private conversation")))

        expect(screen.queryByText("private conversation")).not.toBeInTheDocument()
        releaseRefresh(successResponse({ accessToken: "valid-access-token" }))

        expect(await screen.findByText("private conversation")).toBeInTheDocument()
    })
})

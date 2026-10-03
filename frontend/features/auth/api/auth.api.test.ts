import { API_ROUTES, AUTH_ROUTE_PATHS, ERROR_CODES } from "@linko/contracts"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const TEST_CREDENTIALS = { username: "reader", password: "ValidPass1!" } as const
const ACCESS_TOKEN = "current-access-token"
const ROTATED_ACCESS_TOKEN = "rotated-access-token"

/** Build one API success response for transport tests. */
function successResponse(data: unknown): Response {
    return new Response(JSON.stringify({ success: true, data, error: null, meta: null }), { status: 200 })
}

/** Build one safe API failure response for transport tests. */
function failureResponse(code: string, status: number): Response {
    return new Response(JSON.stringify({
        success: false,
        data: null,
        error: { code, message: "Request denied" },
        meta: null,
    }), { status })
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe("auth API adapter", () => {
    it("refreshes after a 401 and retries the protected request once", async () => {
        const protectedCalls: RequestInit[] = []
        const refreshCalls: RequestInit[] = []
        const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
            const url = String(input)
            if (url === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`) return successResponse({ accessToken: ACCESS_TOKEN })
            if (url === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`) {
                refreshCalls.push(options ?? {})
                return successResponse({ accessToken: ROTATED_ACCESS_TOKEN })
            }
            protectedCalls.push(options ?? {})
            return protectedCalls.length === 1
                ? failureResponse(ERROR_CODES.INVALID_TOKEN, 401)
                : successResponse({ items: [] })
        })
        vi.stubGlobal("fetch", fetchMock)
        const authApi = await import("./auth.api")
        await authApi.login(TEST_CREDENTIALS)

        const result = await authApi.authenticatedApiClient.request<{ items: string[] }>({ path: API_ROUTES.CONVERSATIONS })

        expect(result).toEqual({ items: [] })
        expect(protectedCalls).toHaveLength(2)
        expect(refreshCalls).toHaveLength(1)
        expect(new Headers(protectedCalls[0].headers).get("Authorization")).toBe(`Bearer ${ACCESS_TOKEN}`)
        expect(new Headers(protectedCalls[1].headers).get("Authorization")).toBe(`Bearer ${ROTATED_ACCESS_TOKEN}`)
        expect(refreshCalls[0].credentials).toBe("include")
    })

    it("shares one refresh request across concurrent unauthorized requests", async () => {
        let releaseRefresh: (response: Response) => void = () => undefined
        const waitingRefresh = new Promise<Response>((resolve) => { releaseRefresh = resolve })
        let refreshCalls = 0
        const protectedCalls = new Map<string, number>()
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)
            if (url === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`) return successResponse({ accessToken: ACCESS_TOKEN })
            if (url === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`) {
                refreshCalls += 1
                return waitingRefresh
            }
            const callCount = (protectedCalls.get(url) ?? 0) + 1
            protectedCalls.set(url, callCount)
            return callCount === 1
                ? failureResponse(ERROR_CODES.INVALID_TOKEN, 401)
                : successResponse({ path: url })
        })
        vi.stubGlobal("fetch", fetchMock)
        const authApi = await import("./auth.api")
        await authApi.login(TEST_CREDENTIALS)

        const requests = Promise.all([
            authApi.authenticatedApiClient.request({ path: `${API_ROUTES.CONVERSATIONS}/first` }),
            authApi.authenticatedApiClient.request({ path: `${API_ROUTES.CONVERSATIONS}/second` }),
        ])
        await vi.waitFor(() => expect(refreshCalls).toBe(1))
        releaseRefresh(successResponse({ accessToken: ROTATED_ACCESS_TOKEN }))

        await expect(requests).resolves.toHaveLength(2)
        expect(refreshCalls).toBe(1)
        expect([...protectedCalls.values()]).toEqual([2, 2])
    })

    it("does not refresh or retry more than once when a retried request still gets 401", async () => {
        let refreshCalls = 0
        let protectedCalls = 0
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)
            if (url === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGIN}`) return successResponse({ accessToken: ACCESS_TOKEN })
            if (url === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`) {
                refreshCalls += 1
                return successResponse({ accessToken: ROTATED_ACCESS_TOKEN })
            }
            protectedCalls += 1
            return failureResponse(ERROR_CODES.INVALID_TOKEN, 401)
        })
        vi.stubGlobal("fetch", fetchMock)
        const authApi = await import("./auth.api")
        await authApi.login(TEST_CREDENTIALS)

        await expect(authApi.authenticatedApiClient.request({ path: API_ROUTES.CONVERSATIONS })).rejects.toMatchObject({ status: 401 })

        expect(refreshCalls).toBe(1)
        expect(protectedCalls).toBe(2)
    })
})

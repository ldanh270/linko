import { afterEach, describe, expect, it, vi } from "vitest"
import { ApiClient } from "./client"
import { ApiError } from "./ApiError"

afterEach(() => vi.unstubAllGlobals())

describe("ApiClient", () => {
  it("unwraps success data and accepts injected auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { id: "507f1f77bcf86cd799439011" }, error: null, meta: null }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const client = new ApiClient("/api", () => ({ Authorization: "Bearer test" }))

    await expect(client.request<{ id: string }>({ path: "/users/me" })).resolves.toEqual({ id: "507f1f77bcf86cd799439011" })
    expect(fetchMock).toHaveBeenCalledWith("/api/users/me", expect.objectContaining({ headers: expect.any(Headers), credentials: "include" }))
    expect((fetchMock.mock.calls[0][1].headers as Headers).get("Authorization")).toBe("Bearer test")
  })

  it("normalizes a documented business failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, data: null, error: { code: "FORBIDDEN", message: "Access denied", requestId: "req-1" }, meta: null }), { status: 403 })))
    const client = new ApiClient()

    await expect(client.request({ path: "/private" })).rejects.toMatchObject({ code: "FORBIDDEN", status: 403, requestId: "req-1" } satisfies Partial<ApiError>)
  })

  it("does not expose an unexpected non-envelope response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>failure</html>", { status: 500 })))
    const client = new ApiClient()

    await expect(client.request({ path: "/broken" })).rejects.toMatchObject({ code: "INTERNAL", message: "Something went wrong", status: 500 })
  })

  it("hides a server-provided technical message but keeps its request ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, data: null, error: { code: "INTERNAL", message: "SQL connection string secret", requestId: "req-2" }, meta: null }), { status: 500 })))
    const client = new ApiClient()

    await expect(client.request({ path: "/broken" })).rejects.toMatchObject({ code: "INTERNAL", message: "Something went wrong", requestId: "req-2" })
  })

  it("normalizes network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network failed")))
    const client = new ApiClient()

    await expect(client.request({ path: "/offline" })).rejects.toMatchObject({ code: "NETWORK_ERROR", message: "Something went wrong", status: 0 })
  })

  it("returns an authenticated binary response and forwards cancellation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("private bytes", {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    }))
    vi.stubGlobal("fetch", fetchMock)
    const client = new ApiClient("/api", () => ({ Authorization: "Bearer attachment-token" }))
    const controller = new AbortController()

    const response = await client.requestBlob({ path: "/messages/file", signal: controller.signal })

    expect(await response.text()).toBe("private bytes")
    expect(response.type).toBe("application/pdf")

    expect(fetchMock).toHaveBeenCalledWith("/api/messages/file", expect.objectContaining({
      headers: expect.any(Headers),
      credentials: "include",
      signal: controller.signal,
    }))
    expect((fetchMock.mock.calls[0][1].headers as Headers).get("Authorization")).toBe("Bearer attachment-token")
  })

  it("preserves abort errors for navigation-cancelled binary downloads", async () => {
    const abortController = new AbortController()
    abortController.abort()
    const abortError = new DOMException("The operation was aborted", "AbortError")
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError))
    const client = new ApiClient()

    await expect(client.requestBlob({ path: "/messages/file", signal: abortController.signal }))
      .rejects.toBe(abortError)
  })
})

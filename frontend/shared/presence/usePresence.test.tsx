import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SOCKET_EVENTS } from "@linko/contracts"
import { usePresence } from "./usePresence"
import { resetSharedChatSocket } from "@/features/chat/api/chatSocket"

const { listeners, emit, disconnect, socketFactory } = vi.hoisted(() => {
  const listeners = new Map<string, (...args: unknown[]) => void>()
  const emit = vi.fn((event: string, ids: string[], ack: (statuses: Record<string, boolean>) => void) => {
    if (event === "presence:query") ack(Object.fromEntries(ids.map((id) => [id, true])))
  })
  const disconnect = vi.fn()
  return { listeners, emit, disconnect, socketFactory: vi.fn(() => ({ connected: true, emit, disconnect,
    on: (event: string, listener: (...args: unknown[]) => void) => listeners.set(event, listener),
    off: (event: string) => listeners.delete(event),
  })) }
})
vi.mock("socket.io-client", () => ({ io: socketFactory }))
afterEach(() => { resetSharedChatSocket(); emit.mockClear(); listeners.clear() })

describe("usePresence", () => {
  it("does not re-query for a new array with the same identifiers", () => {
    const { result, rerender } = renderHook(() => usePresence(["peer"]))
    expect(result.current.isOnline("peer")).toBe(true)
    const count = emit.mock.calls.length
    rerender()
    expect(emit).toHaveBeenCalledTimes(count)
  })

  it("forgets unmounted identifiers before reconnect queries", () => {
    const first = renderHook(() => usePresence(["peer-a"]))
    const second = renderHook(() => usePresence(["peer-b"]))
    first.unmount()
    emit.mockClear()
    act(() => listeners.get(SOCKET_EVENTS.CONNECT)?.())
    expect(emit).toHaveBeenCalledWith(SOCKET_EVENTS.PRESENCE_QUERY, ["peer-b"], expect.any(Function))
    second.unmount()
  })

  it("drops the account snapshot and releases presence listeners on session reset", () => {
    const { result, unmount } = renderHook(() => usePresence(["peer"]))
    expect(result.current.isOnline("peer")).toBe(true)
    act(() => resetSharedChatSocket())
    expect(result.current.isOnline("peer")).toBe(false)
    expect(listeners.has(SOCKET_EVENTS.PRESENCE_ONLINE)).toBe(false)
    unmount()
  })
})

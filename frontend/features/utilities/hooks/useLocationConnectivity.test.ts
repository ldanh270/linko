import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ connected: true, handlers: new Map<string, Set<() => void>>() }))
vi.mock("@/features/chat/api/chatSocket", () => ({ getSharedChatSocket: () => ({ get connected() { return state.connected }, on: (event: string, callback: () => void) => { const callbacks = state.handlers.get(event) ?? new Set(); callbacks.add(callback); state.handlers.set(event, callbacks) }, off: (event: string, callback: () => void) => state.handlers.get(event)?.delete(callback) }) }))
import { useLocationConnectivity } from "./useLocationConnectivity"

beforeEach(() => { state.connected = true; state.handlers.clear(); Object.defineProperty(navigator, "onLine", { configurable: true, value: true }) })
describe("location viewer connectivity", () => {
  it("pauses immediately on offline and resumes when online", () => {
    const { result } = renderHook(useLocationConnectivity)
    expect(result.current).toBe(true)
    act(() => { Object.defineProperty(navigator, "onLine", { configurable: true, value: false }); window.dispatchEvent(new Event("offline")) })
    expect(result.current).toBe(false)
    act(() => { Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); window.dispatchEvent(new Event("online")) })
    expect(result.current).toBe(true)
  })
  it("pauses immediately on socket loss and removes listeners on unmount", () => {
    const { result, unmount } = renderHook(useLocationConnectivity)
    act(() => { state.connected = false; state.handlers.get("disconnect")?.forEach((listener) => listener()) })
    expect(result.current).toBe(false)
    unmount()
    expect([...state.handlers.values()].every((listeners) => listeners.size === 0)).toBe(true)
  })
})

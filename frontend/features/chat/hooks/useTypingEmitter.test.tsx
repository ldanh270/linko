import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SOCKET_EVENTS } from "@linko/contracts"
import { useTypingEmitter } from "./useTypingEmitter"

const { socket, getSocket } = vi.hoisted(() => {
  const socket = { connected: true, emit: vi.fn() }
  return { socket, getSocket: vi.fn(() => socket) }
})
vi.mock("../api/chatSocket", () => ({ getSharedChatSocket: getSocket }))
afterEach(() => { vi.useRealTimers(); socket.emit.mockClear(); getSocket.mockClear(); socket.connected = true })

describe("useTypingEmitter", () => {
  it("does not recreate a socket when logout resets the session before unmount", () => {
    const { result, unmount } = renderHook(() => useTypingEmitter({ conversationId: "chat-a", isEnabled: true }))
    act(() => result.current.onTyping())
    const lookups = getSocket.mock.calls.length
    socket.connected = false
    unmount()
    expect(getSocket).toHaveBeenCalledTimes(lookups)
    expect(socket.emit).toHaveBeenCalledTimes(1)
  })
  it("refreshes at most once a second and stops after idle", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTypingEmitter({ conversationId: "chat-a", isEnabled: true }))
    act(() => { result.current.onTyping(); result.current.onTyping() })
    expect(socket.emit).toHaveBeenCalledTimes(1)
    act(() => { vi.advanceTimersByTime(1000); result.current.onTyping() })
    expect(socket.emit).toHaveBeenCalledTimes(2)
    act(() => vi.advanceTimersByTime(2500))
    expect(socket.emit).toHaveBeenLastCalledWith(SOCKET_EVENTS.TYPING_STOP, { conversationId: "chat-a" })
  })

  it("stops on preference changes and never buffers disconnected typing", () => {
    const { result, rerender } = renderHook(({ isEnabled }) => useTypingEmitter({ conversationId: "chat-a", isEnabled }), { initialProps: { isEnabled: true } })
    act(() => result.current.onTyping())
    rerender({ isEnabled: false })
    expect(socket.emit).toHaveBeenLastCalledWith(SOCKET_EVENTS.TYPING_STOP, { conversationId: "chat-a" })
    socket.emit.mockClear()
    act(() => result.current.onTyping())
    expect(socket.emit).not.toHaveBeenCalled()
    socket.connected = false
    rerender({ isEnabled: true })
    act(() => result.current.onTyping())
    expect(socket.emit).not.toHaveBeenCalled()
  })

  it("stops the old conversation when changing recipients", () => {
    const { result, rerender } = renderHook(({ conversationId }) => useTypingEmitter({ conversationId, isEnabled: true }), { initialProps: { conversationId: "chat-a" } })
    act(() => result.current.onTyping())
    rerender({ conversationId: "chat-b" })
    expect(socket.emit).toHaveBeenLastCalledWith(SOCKET_EVENTS.TYPING_STOP, { conversationId: "chat-a" })
    act(() => result.current.onTyping())
    expect(socket.emit).toHaveBeenLastCalledWith(SOCKET_EVENTS.TYPING_START, { conversationId: "chat-b" })
  })
})

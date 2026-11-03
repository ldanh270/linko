import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SOCKET_EVENTS, type TypingEventDto } from "@linko/contracts"
import { useTypingIndicator } from "./useTypingIndicator"

const { listeners } = vi.hoisted(() => ({ listeners: new Map<string, (payload?: TypingEventDto) => void>() }))
vi.mock("../api/chatSocket", () => ({ getSharedChatSocket: () => ({
  on: (event: string, listener: (payload?: TypingEventDto) => void) => listeners.set(event, listener),
  off: (event: string) => listeners.delete(event),
}) }))
afterEach(() => { vi.useRealTimers(); listeners.clear() })

describe("useTypingIndicator", () => {
  it("clears other-chat state immediately when switching conversations", () => {
    const { result, rerender } = renderHook(({ id }) => useTypingIndicator(id, "me"), { initialProps: { id: "chat-a" } })
    act(() => listeners.get(SOCKET_EVENTS.TYPING_UPDATE)?.({ conversationId: "chat-a", userId: "peer", isTyping: true }))
    expect(result.current.typingUserIds).toEqual(["peer"])
    rerender({ id: "chat-b" })
    expect(result.current.typingUserIds).toEqual([])
    rerender({ id: "chat-a" })
    expect(result.current.typingUserIds).toEqual([])
  })

  it("ignores self and other chats, expires stale typing and clears on disconnect", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTypingIndicator("chat-a", "me"))
    act(() => {
      listeners.get(SOCKET_EVENTS.TYPING_UPDATE)?.({ conversationId: "chat-b", userId: "peer", isTyping: true })
      listeners.get(SOCKET_EVENTS.TYPING_UPDATE)?.({ conversationId: "chat-a", userId: "me", isTyping: true })
    })
    expect(result.current.typingUserIds).toEqual([])
    act(() => listeners.get(SOCKET_EVENTS.TYPING_UPDATE)?.({ conversationId: "chat-a", userId: "peer", isTyping: true }))
    act(() => vi.advanceTimersByTime(3500))
    expect(result.current.typingUserIds).toEqual([])
    act(() => listeners.get(SOCKET_EVENTS.TYPING_UPDATE)?.({ conversationId: "chat-a", userId: "peer", isTyping: true }))
    act(() => listeners.get("disconnect")?.())
    expect(result.current.typingUserIds).toEqual([])
  })
})

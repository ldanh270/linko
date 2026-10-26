import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import type { MessageDto } from "@linko/contracts"

import * as inboxCache from "@/features/inbox/inbox.cache"
import { notificationSound } from "@/shared/sound/notificationSound"
import { useConversationChat } from "./useConversationChat"

const { mockMessage, fakeSocket } = vi.hoisted(() => ({
  mockMessage: {
    id: "msg-123",
    conversationId: "conv-abc",
    senderId: "user-me",
    content: "hello world",
    clientMessageId: "client-123",
    replyTo: null,
    mentions: [],
    attachments: [],
    createdAt: "2026-10-25T10:20:00.000Z",
  } as MessageDto,
  fakeSocket: { disconnect: vi.fn(), emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}))

let socketMessageCallback: ((message: MessageDto) => void) | null = null

vi.mock("@/features/profile/hooks/useCurrentProfile", () => ({
  useCurrentProfile: () => ({ data: { id: "user-me", displayName: "Duc An", avatarUrl: null } }),
}))

vi.mock("../api/messages.api", () => ({
  listMessages: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  sendMessage: vi.fn().mockImplementation(() => Promise.resolve(mockMessage)),
}))

vi.mock("../api/attachments.api", () => ({
  sendMessageFiles: vi.fn().mockResolvedValue(mockMessage),
}))

vi.mock("../api/chatSocket", () => ({
  createChatSocket: vi.fn().mockReturnValue(fakeSocket),
  getSharedChatSocket: vi.fn().mockReturnValue(fakeSocket),
  subscribeToConversation: vi.fn().mockImplementation((_socket, _convId, onMessage) => {
    socketMessageCallback = onMessage
    return () => { socketMessageCallback = null }
  }),
  mergeMessageById: (list: readonly MessageDto[], item: MessageDto) => [...list.filter((m) => m.id !== item.id && m.clientMessageId !== item.clientMessageId), item],
}))

describe("useConversationChat inbox synchronization", () => {
  it("should_synchronize_inbox_cache_when_send_mutation_succeeds", async () => {
    const queryClient = new QueryClient()
    const syncSpy = vi.spyOn(inboxCache, "updateInboxItemWithNewMessage")

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useConversationChat("conv-abc"), { wrapper })

    await act(async () => {
      await result.current.send.mutateAsync({
        clientMessageId: "client-123",
        content: "hello world",
        mentions: [],
        files: [],
      })
    })

    // Should be called with optimistic message and then server message
    expect(syncSpy).toHaveBeenCalledWith(queryClient, mockMessage, {
      displayName: "Duc An",
      avatarUrl: null,
      incrementUnread: false,
    })
  })

  it("should_synchronize_inbox_cache_when_realtime_message_is_received", async () => {
    const queryClient = new QueryClient()
    const syncSpy = vi.spyOn(inboxCache, "updateInboxItemWithNewMessage")

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    renderHook(() => useConversationChat("conv-abc"), { wrapper })

    expect(socketMessageCallback).not.toBeNull()

    const incoming: MessageDto = {
      ...mockMessage,
      id: "incoming-msg",
      senderId: "user-other",
      content: "hi from other",
    }

    act(() => {
      socketMessageCallback?.(incoming)
    })

    expect(syncSpy).toHaveBeenCalledWith(queryClient, incoming, { incrementUnread: false })
  })

  it("should_play_sound_only_for_fresh_messages_from_others", () => {
    const queryClient = new QueryClient()
    const playSpy = vi.spyOn(notificationSound, "play").mockImplementation(() => {})

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children)

    renderHook(() => useConversationChat("conv-abc"), { wrapper })

    // 1. Fresh message from other user -> plays
    const freshMessage: MessageDto = {
      ...mockMessage,
      id: "fresh-1",
      senderId: "user-other",
      createdAt: new Date().toISOString(),
    }
    act(() => {
      socketMessageCallback?.(freshMessage)
    })
    expect(playSpy).toHaveBeenCalledTimes(1)

    // 2. Historical message (>10s old) from other user -> does NOT play
    const oldDate = new Date(Date.now() - 60_000).toISOString()
    const historicalMessage: MessageDto = {
      ...mockMessage,
      id: "historical-1",
      senderId: "user-other",
      createdAt: oldDate,
    }
    act(() => {
      socketMessageCallback?.(historicalMessage)
    })
    expect(playSpy).toHaveBeenCalledTimes(1) // Still 1

    // 3. Fresh message from current user -> does NOT play
    const ownMessage: MessageDto = {
      ...mockMessage,
      id: "own-1",
      senderId: "user-me",
      createdAt: new Date().toISOString(),
    }
    act(() => {
      socketMessageCallback?.(ownMessage)
    })
    expect(playSpy).toHaveBeenCalledTimes(1) // Still 1

    playSpy.mockRestore()
  })
})

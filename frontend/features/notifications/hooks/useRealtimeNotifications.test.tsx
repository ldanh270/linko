import { createElement, type ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SOCKET_EVENTS, type MessageDto } from "@linko/contracts"
import { ToastContext } from "@/shared/components/useToast"
import { useRealtimeNotifications } from "./useRealtimeNotifications"

const mocks = vi.hoisted(() => ({
  listeners: new Map<string, (message: MessageDto) => void>(), preference: vi.fn(), show: vi.fn(), sound: vi.fn(), browser: vi.fn(), push: vi.fn(),
}))
vi.mock("@/features/chat/api/chatSocket", () => ({ getSharedChatSocket: () => ({
  on: (event: string, listener: (message: MessageDto) => void) => mocks.listeners.set(event, listener),
  off: (event: string) => mocks.listeners.delete(event),
}) }))
vi.mock("@/features/profile/hooks/useCurrentProfile", () => ({ useCurrentProfile: () => ({ data: { id: "me" } }) }))
vi.mock("@/features/settings/api/notification.api", () => ({ getGroupNotificationPreference: mocks.preference }))
vi.mock("@/shared/sound/notificationSound", () => ({ notificationSound: { play: mocks.sound } }))
vi.mock("../api/browserNotification", () => ({ getBrowserNotificationPermission: () => "granted", showBrowserNotification: mocks.browser }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }))

beforeEach(() => { mocks.preference.mockResolvedValue({ isMuted: false }); Object.defineProperty(document, "hidden", { configurable: true, value: false }) })
afterEach(() => { vi.clearAllMocks(); mocks.listeners.clear(); localStorage.clear() })

describe("global realtime notifications", () => {
  it("processes a duplicate only once before preference fetch or unread increment", async () => {
    const { client } = mount(null)
    client.setQueryData(["inbox"], { items: [{ id: "chat", participants: [], unreadCount: 0 }], nextCursor: null })
    await dispatch(message())
    await dispatch(message())
    expect(client.getQueryData<{ items: { unreadCount: number }[] }>(["inbox"])?.items[0].unreadCount).toBe(1)
    expect(mocks.preference).toHaveBeenCalledTimes(1)
    expect(mocks.show).toHaveBeenCalledTimes(1)
    expect(mocks.sound).toHaveBeenCalledTimes(1)
  })

  it("delivers a background browser alert outside the notifications page", async () => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true })
    mount("chat")
    await dispatch(message())
    expect(mocks.browser).toHaveBeenCalledOnce()
    expect(mocks.show).not.toHaveBeenCalled()
    expect(mocks.sound).toHaveBeenCalledOnce()
  })

  it("does not notify own or muted messages", async () => {
    mount(null)
    await dispatch({ ...message(), senderId: "me" })
    mocks.preference.mockResolvedValue({ isMuted: true })
    await dispatch({ ...message(), id: "second" })
    expect(mocks.show).not.toHaveBeenCalled()
    expect(mocks.browser).not.toHaveBeenCalled()
    expect(mocks.sound).not.toHaveBeenCalled()
  })

  it("rechecks the current route after asynchronous mute lookup", async () => {
    let resolvePreference: (value: { isMuted: boolean }) => void = () => {}
    mocks.preference.mockReturnValue(new Promise((resolve) => { resolvePreference = resolve }))
    const { rerender } = mount(null)
    await dispatch(message())
    rerender({ visible: "chat" })
    await act(async () => resolvePreference({ isMuted: false }))
    expect(mocks.show).not.toHaveBeenCalled()
  })

  it("respects disabled previews and refetches inbox on reconnect without replaying alerts", async () => {
    localStorage.setItem("linko_chat_preferences", JSON.stringify({ previewToast: false }))
    const { client } = mount(null)
    const invalidate = vi.spyOn(client, "invalidateQueries")
    Object.defineProperty(document, "hidden", { configurable: true, value: true })
    await dispatch(message())
    expect(JSON.stringify(mocks.browser.mock.calls)).not.toContain("private content")
    act(() => mocks.listeners.get(SOCKET_EVENTS.CONNECT)?.(message()))
    expect(invalidate).toHaveBeenCalled()
    expect(mocks.browser).toHaveBeenCalledTimes(1)
  })

  it("cancels delivery after unmount while a preference lookup is pending", async () => {
    let resolvePreference: (value: { isMuted: boolean }) => void = () => {}
    mocks.preference.mockReturnValue(new Promise((resolve) => { resolvePreference = resolve }))
    const { unmount } = mount(null)
    await dispatch(message())
    unmount()
    await act(async () => resolvePreference({ isMuted: false }))
    expect(mocks.show).not.toHaveBeenCalled()
    expect(mocks.sound).not.toHaveBeenCalled()
  })
})

function mount(visible: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client },
    createElement(ToastContext.Provider, { value: { toasts: [], show: mocks.show, dismiss: vi.fn() } }, children))
  return { client, ...renderHook(({ visible }) => useRealtimeNotifications(visible), { initialProps: { visible }, wrapper }) }
}

function message(): MessageDto { return { id: "one", senderId: "peer", conversationId: "chat", content: "private content" } as MessageDto }
async function dispatch(message: MessageDto) { await act(async () => mocks.listeners.get(SOCKET_EVENTS.MESSAGE_CREATED)?.(message)) }

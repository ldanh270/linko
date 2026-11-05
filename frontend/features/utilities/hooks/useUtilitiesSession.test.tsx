import { createElement, type ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SOCKET_EVENTS, UTILITY_EVENTS, type ReminderDto } from "@linko/contracts"
import { useUtilitiesSession } from "./useUtilitiesSession"

const mocks = vi.hoisted(() => ({ listeners: new Map<string, (event: unknown) => void>(), show: vi.fn(), sound: vi.fn(), browser: vi.fn(), reminder: vi.fn(), inbox: vi.fn(), publisher: { subscribe: () => () => undefined, snapshot: () => [] as const, refresh: vi.fn(), stop: vi.fn(), resume: vi.fn() } }))
vi.mock("@/features/chat/api/chatSocket", () => ({ getSharedChatSocket: () => ({ on: (event: string, handler: (payload: unknown) => void) => mocks.listeners.set(event, handler), off: (event: string) => mocks.listeners.delete(event) }) }))
vi.mock("@/shared/components/useToast", () => ({ useToast: () => ({ show: mocks.show }) }))
vi.mock("@/shared/sound/notificationSound", () => ({ notificationSound: { play: mocks.sound } }))
vi.mock("@/features/notifications/api/browserNotification", () => ({ showBrowserNotification: mocks.browser }))
vi.mock("../location-publisher", () => ({ getLocationPublisher: () => mocks.publisher }))
vi.mock("../api/utility.api", () => ({ utilityApi: { reminders: mocks.inbox, reminderInbox: mocks.inbox, reminder: mocks.reminder } }))
vi.mock("./useUtilityPanel", () => ({ useUtilityPanel: () => ({ panel: "", close: vi.fn() }) }))
const snapshot: readonly never[] = []
const delivery: ReminderDto = { id: "delivered-id", conversationId: "conversation", messageId: "source", title: "Private meeting", note: "", dueAt: new Date().toISOString(), deliveredAt: new Date().toISOString(), readAt: null, status: "delivered", appointmentId: null }
beforeEach(() => {
  mocks.publisher.snapshot = () => snapshot
  mocks.inbox.mockResolvedValue({ items: [], unreadCount: 7, nextCursor: null })
  mocks.reminder.mockResolvedValue(delivery)
  Object.defineProperty(document, "hidden", { configurable: true, value: false })
})
afterEach(() => { vi.clearAllMocks(); mocks.listeners.clear(); localStorage.clear() })
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  return { client, ...renderHook(() => useUtilitiesSession(), { wrapper }) }
}
describe("utility session authorization and reminder delivery", () => {
  it("fetches a delivered reminder by ID even when absent from the first inbox page", async () => {
    const { result } = mount()
    await waitFor(() => expect(result.current.unread).toBe(7))
    act(() => mocks.listeners.get(UTILITY_EVENTS.REMINDER)?.({ reminderId: delivery.id }))
    await waitFor(() => expect(mocks.show).toHaveBeenCalledWith(delivery.title, "info"))
    expect(mocks.reminder).toHaveBeenCalledWith(delivery.id)
    expect(mocks.sound).toHaveBeenCalledOnce()
    act(() => mocks.listeners.get(UTILITY_EVENTS.REMINDER)?.({ reminderId: delivery.id }))
    expect(mocks.reminder).toHaveBeenCalledTimes(1)
  })
  it("clears sensitive utility, context and inbox data on membership changes", async () => {
    const { client } = mount()
    await waitFor(() => expect(mocks.inbox).toHaveBeenCalled())
    client.setQueryData(["chat-utilities", "conversation", "appointments"], [{ title: "Restricted" }])
    client.setQueryData(["message-context", "conversation", "source"], [{ content: "Restricted" }])
    client.setQueryData(["personal-reminders", "delivery", delivery.id], delivery)
    act(() => mocks.listeners.get(SOCKET_EVENTS.MEMBERSHIP_CHANGED)?.({ conversationId: "conversation" }))
    await waitFor(() => expect(client.getQueryData(["chat-utilities", "conversation", "appointments"])).toBeUndefined())
    expect(client.getQueryData(["message-context", "conversation", "source"])).toBeUndefined()
    expect(client.getQueryData(["personal-reminders", "delivery", delivery.id])).toBeUndefined()
  })
  it("suppresses an in-flight preview when access changes before its response", async () => {
    let resolve: (value: ReminderDto) => void = () => undefined
    mocks.reminder.mockReturnValue(new Promise<ReminderDto>((complete) => { resolve = complete }))
    mount()
    act(() => mocks.listeners.get(UTILITY_EVENTS.REMINDER)?.({ reminderId: delivery.id }))
    await waitFor(() => expect(mocks.reminder).toHaveBeenCalled())
    act(() => mocks.listeners.get(SOCKET_EVENTS.CONVERSATION_UPDATED)?.({ conversationId: "conversation" }))
    await act(async () => resolve(delivery))
    expect(mocks.show).not.toHaveBeenCalled()
    expect(mocks.sound).not.toHaveBeenCalled()
  })
})

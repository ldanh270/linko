import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { SOCKET_EVENTS, type MessageDto } from "@linko/contracts"
import { ToastProvider } from "@/shared/components/ToastProvider"
import { NotificationToastsListener } from "./NotificationToastsListener"

const { socketMock, preferenceMock } = vi.hoisted(() => ({ socketMock: vi.fn(), preferenceMock: vi.fn() }))
vi.mock("@/features/chat/api/chatSocket", () => ({ createChatSocket: socketMock }))
vi.mock("../api/notification.api", () => ({ getGroupNotificationPreference: preferenceMock }))
vi.mock("@/shared/layout/useWorkspaceNavigation", () => ({ useWorkspaceNavigation: () => ({ conversationId: "aaaaaaaaaaaaaaaaaaaaaaaa", isConversationView: false, isDetail: false }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe("responsive notification suppression", () => {
  it("should_toast_for_a_chat_hidden_behind_a_mobile_profile_panel", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    const listeners = new Map<string, (message: MessageDto) => void>()
    socketMock.mockReturnValue({ on: (event: string, listener: (message: MessageDto) => void) => listeners.set(event, listener), off: vi.fn(), disconnect: vi.fn() })
    preferenceMock.mockResolvedValue({ conversationId: "aaaaaaaaaaaaaaaaaaaaaaaa", isMuted: false })
    render(<ToastProvider><NotificationToastsListener /></ToastProvider>)
    const message = { id: "m", conversationId: "aaaaaaaaaaaaaaaaaaaaaaaa" } as MessageDto
    await act(async () => listeners.get(SOCKET_EVENTS.MESSAGE_CREATED)?.(message))
    expect(await screen.findByText("Bạn có tin nhắn mới")).toBeVisible()
  })
})

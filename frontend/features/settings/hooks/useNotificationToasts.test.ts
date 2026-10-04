import {
    MESSAGE_FIELDS,
    NOTIFICATION_PREFERENCE_FIELDS,
    SOCKET_EVENTS,
    type MessageDto,
} from "@linko/contracts"
import { createElement, type ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { Socket } from "socket.io-client"
import { afterEach, describe, expect, it, vi } from "vitest"

const { createChatSocketMock, getPreferenceMock } = vi.hoisted(() => ({
    createChatSocketMock: vi.fn(),
    getPreferenceMock: vi.fn(),
}))

vi.mock("../../chat/api/chatSocket", () => ({ createChatSocket: createChatSocketMock }))
vi.mock("../api/notification.api", () => ({ getGroupNotificationPreference: getPreferenceMock }))

import { ToastContext, type ToastState } from "../../../shared/components/useToast"
import { getActiveGroupConversationId } from "../notification.constants"
import { useNotificationToasts } from "./useNotificationToasts"

const ACTIVE_CONVERSATION_ID = "507f1f77bcf86cd799439011"
const OTHER_CONVERSATION_ID = "507f1f77bcf86cd799439012"

afterEach(() => {
    createChatSocketMock.mockReset()
    getPreferenceMock.mockReset()
})

describe("useNotificationToasts", () => {
    it("should_resolve_the_current_group_chat_route_for_suppression", () => {
        expect(getActiveGroupConversationId(`/groups/${ACTIVE_CONVERSATION_ID}`)).toBe(ACTIVE_CONVERSATION_ID)
        expect(getActiveGroupConversationId(`/groups/${ACTIVE_CONVERSATION_ID}/info`)).toBeNull()
        expect(getActiveGroupConversationId("/inbox")).toBeNull()
    })

    it("should_not_show_a_toast_for_a_muted_group", async () => {
        const socket = createFakeSocket()
        const toast = createToastState()
        createChatSocketMock.mockReturnValue(socket)
        getPreferenceMock.mockResolvedValue({
            [NOTIFICATION_PREFERENCE_FIELDS.CONVERSATION_ID]: OTHER_CONVERSATION_ID,
            [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: true,
        })
        renderHook(() => useNotificationToasts(ACTIVE_CONVERSATION_ID), { wrapper: withToast(toast) })

        await publishMessage(socket, createMessage(OTHER_CONVERSATION_ID))

        expect(toast.show).not.toHaveBeenCalled()
    })

    it("should_skip_the_open_room_and_toast_for_another_unmuted_group", async () => {
        const socket = createFakeSocket()
        const toast = createToastState()
        createChatSocketMock.mockReturnValue(socket)
        getPreferenceMock.mockResolvedValue({
            [NOTIFICATION_PREFERENCE_FIELDS.CONVERSATION_ID]: OTHER_CONVERSATION_ID,
            [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: false,
        })
        renderHook(() => useNotificationToasts(ACTIVE_CONVERSATION_ID), { wrapper: withToast(toast) })

        await publishMessage(socket, createMessage(ACTIVE_CONVERSATION_ID))
        expect(getPreferenceMock).not.toHaveBeenCalled()
        expect(toast.show).not.toHaveBeenCalled()

        await publishMessage(socket, createMessage(OTHER_CONVERSATION_ID))

        expect(getPreferenceMock).toHaveBeenCalledTimes(1)
        expect(toast.show).toHaveBeenCalledTimes(1)
    })

    it("should_read_the_preference_again_after_a_change_from_another_tab", async () => {
        const socket = createFakeSocket()
        const toast = createToastState()
        createChatSocketMock.mockReturnValue(socket)
        getPreferenceMock
            .mockResolvedValueOnce({
                [NOTIFICATION_PREFERENCE_FIELDS.CONVERSATION_ID]: OTHER_CONVERSATION_ID,
                [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: false,
            })
            .mockResolvedValueOnce({
                [NOTIFICATION_PREFERENCE_FIELDS.CONVERSATION_ID]: OTHER_CONVERSATION_ID,
                [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: true,
            })
        renderHook(() => useNotificationToasts(ACTIVE_CONVERSATION_ID), { wrapper: withToast(toast) })

        await publishMessage(socket, createMessage(OTHER_CONVERSATION_ID))
        await waitFor(() => expect(toast.show).toHaveBeenCalledTimes(1))
        await publishMessage(socket, createMessage(OTHER_CONVERSATION_ID))
        await waitFor(() => expect(getPreferenceMock).toHaveBeenCalledTimes(2))

        expect(toast.show).toHaveBeenCalledTimes(1)
    })
})

function createFakeSocket(): Socket & { dispatch(event: string, payload: MessageDto): void } {
    const listeners = new Map<string, (payload: MessageDto) => void>()
    const socket = {
        connected: true,
        emit: vi.fn(),
        on: vi.fn((event: string, listener: (payload: MessageDto) => void) => {
            listeners.set(event, listener)
        }),
        off: vi.fn((event: string) => { listeners.delete(event) }),
        disconnect: vi.fn(),
        dispatch(event: string, payload: MessageDto) {
            listeners.get(event)?.(payload)
        },
    }
    return socket as unknown as Socket & typeof socket
}

async function publishMessage(socket: ReturnType<typeof createFakeSocket>, message: MessageDto): Promise<void> {
    await act(async () => {
        socket.dispatch(SOCKET_EVENTS.MESSAGE_CREATED, message)
    })
}

function createToastState(): ToastState {
    return {
        toasts: [],
        show: vi.fn(),
        dismiss: vi.fn(),
    }
}

function withToast(toast: ToastState) {
    const Wrapper = ({ children }: { children: ReactNode }) =>
        createElement(ToastContext.Provider, { value: toast }, children)
    Wrapper.displayName = "NotificationToastTestProvider"
    return Wrapper
}

function createMessage(conversationId: string): MessageDto {
    return {
        [MESSAGE_FIELDS.ID]: "507f1f77bcf86cd799439013",
        [MESSAGE_FIELDS.CONVERSATION_ID]: conversationId,
        [MESSAGE_FIELDS.SENDER_ID]: "507f1f77bcf86cd799439014",
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: "notification-message",
        [MESSAGE_FIELDS.CONTENT]: "New message",
        [MESSAGE_FIELDS.REPLY_TO]: null,
        [MESSAGE_FIELDS.MENTIONS]: [],
        [MESSAGE_FIELDS.ATTACHMENTS]: [],
        [MESSAGE_FIELDS.CREATED_AT]: "2026-10-04T13:00:00.000Z",
        [MESSAGE_FIELDS.UPDATED_AT]: "2026-10-04T13:00:00.000Z",
    }
}

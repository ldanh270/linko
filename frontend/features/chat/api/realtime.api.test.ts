import {
    ERROR_CODES,
    MESSAGE_FIELDS,
    SOCKET_EVENTS,
    type ApiEnvelope,
    type CursorPage,
    type MessageDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

const { mockIo } = vi.hoisted(() => ({ mockIo: vi.fn() }))
vi.mock("socket.io-client", () => ({ io: mockIo }))

import { login, logout } from "../../auth/api/auth.api"
import { createChatSocket, mergeMessageById, subscribeToConversation, type ChatSocket } from "./chatSocket"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const MESSAGE_ID = "507f1f77bcf86cd799439012"
const NEXT_MESSAGE_ID = "507f1f77bcf86cd799439013"
const MESSAGE: MessageDto = {
    [MESSAGE_FIELDS.ID]: MESSAGE_ID,
    [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
    [MESSAGE_FIELDS.SENDER_ID]: "507f1f77bcf86cd799439014",
    [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: "client-message-001",
    [MESSAGE_FIELDS.CONTENT]: "One message",
    [MESSAGE_FIELDS.REPLY_TO]: null,
    [MESSAGE_FIELDS.MENTIONS]: [],
    [MESSAGE_FIELDS.ATTACHMENTS]: [],
    [MESSAGE_FIELDS.CREATED_AT]: "2026-10-04T12:00:00.000Z",
    [MESSAGE_FIELDS.UPDATED_AT]: "2026-10-04T12:00:00.000Z",
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})

describe("chat realtime adapter", () => {
    it("should_read_the_current_access_token_for_each_socket_handshake", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse({ accessToken: "fresh-access-token" })))
        const socket = createFakeSocket()
        mockIo.mockReturnValue(socket)

        await login({ username: "member", password: "Password1!" })
        const result = createChatSocket()
        const options = mockIo.mock.calls[0]?.[1] as { auth: (complete: (auth: unknown) => void) => void }
        const auth = vi.fn()
        options.auth(auth)

        expect(result).toBe(socket)
        expect(mockIo).toHaveBeenCalledWith(undefined, expect.any(Object))
        expect(auth).toHaveBeenCalledWith({ token: "fresh-access-token" })

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse(null)))
        await logout()
    })

    it("should_resubscribe_without_duplicate_listeners_and_merge_by_message_id", () => {
        const socket = createFakeSocket()
        const onMessage = vi.fn()
        const disposeFirst = subscribeToConversation(socket, CONVERSATION_ID, onMessage, {
            initialMessages: [MESSAGE],
        })
        const eventListener = socket.listeners.get(SOCKET_EVENTS.MESSAGE_CREATED)
        eventListener?.(MESSAGE)
        eventListener?.(createMessage(NEXT_MESSAGE_ID, "A newer message"))

        expect(onMessage).toHaveBeenCalledTimes(1)
        expect(mergeMessageById([MESSAGE], MESSAGE)).toEqual([MESSAGE])
        expect(mergeMessageById([MESSAGE], createMessage(NEXT_MESSAGE_ID, "A newer message")))
            .toHaveLength(2)

        disposeFirst()
        const disposeSecond = subscribeToConversation(socket, CONVERSATION_ID, onMessage, {
            initialMessages: [MESSAGE],
        })
        expect(socket.on).toHaveBeenCalledTimes(4)
        expect(socket.off).toHaveBeenCalledTimes(2)
        disposeSecond()
    })

    it("should_recover_all_pages_after_reconnect_and_skip_socket_duplicates", async () => {
        const recovered = createMessage(NEXT_MESSAGE_ID, "Recovered message")
        const finalMessage = createMessage("507f1f77bcf86cd799439015", "Second recovered message")
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(successResponse<CursorPage<MessageDto>>({ items: [recovered], nextCursor: NEXT_MESSAGE_ID }))
            .mockResolvedValueOnce(successResponse<CursorPage<MessageDto>>({ items: [finalMessage], nextCursor: null }))
        vi.stubGlobal("fetch", fetchMock)
        const socket = createFakeSocket()
        const onMessage = vi.fn()
        const dispose = subscribeToConversation(socket, CONVERSATION_ID, onMessage, { initialMessages: [MESSAGE] })
        socket.connected = true
        socket.listeners.get(SOCKET_EVENTS.CONNECT)?.(MESSAGE)
        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

        expect(new URL(String(fetchMock.mock.calls[0]?.[0]), "https://linko.example").searchParams.get("afterMessageId"))
            .toBe(MESSAGE_ID)
        expect(new URL(String(fetchMock.mock.calls[1]?.[0]), "https://linko.example").searchParams.get("afterMessageId"))
            .toBe(NEXT_MESSAGE_ID)
        expect(socket.emit).toHaveBeenCalledWith(SOCKET_EVENTS.CONVERSATION_JOIN, CONVERSATION_ID)
        expect(onMessage.mock.calls.map(([message]) => (message as MessageDto)[MESSAGE_FIELDS.ID]))
            .toEqual([NEXT_MESSAGE_ID, finalMessage[MESSAGE_FIELDS.ID]])
        socket.listeners.get(SOCKET_EVENTS.MESSAGE_CREATED)?.(recovered)
        expect(onMessage).toHaveBeenCalledTimes(2)
        dispose()
    })

    it("should_preserve_the_api_error_code_when_reconnect_recovery_fails", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.FORBIDDEN, message: "Membership ended" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(failure), { status: 403 })))
        const socket = createFakeSocket()
        const onSyncError = vi.fn()
        const dispose = subscribeToConversation(socket, CONVERSATION_ID, vi.fn(), {
            initialMessages: [MESSAGE],
            onSyncError,
        })
        socket.connected = true
        socket.listeners.get(SOCKET_EVENTS.CONNECT)?.(MESSAGE)
        await vi.waitFor(() => expect(onSyncError).toHaveBeenCalled())

        expect(onSyncError).toHaveBeenCalledWith(expect.objectContaining({ code: ERROR_CODES.FORBIDDEN }))
        dispose()
    })
})

function createFakeSocket() {
    const listeners = new Map<string, (payload: MessageDto) => void>()
    const socket = {
        connected: false,
        emit: vi.fn(),
        on: vi.fn((event: string, listener: (payload: MessageDto) => void) => {
            listeners.set(event, listener)
        }),
        off: vi.fn((event: string) => { listeners.delete(event) }),
        listeners,
    }
    return socket as unknown as ChatSocket & typeof socket
}

function createMessage(id: string, content: string): MessageDto {
    return { ...MESSAGE, [MESSAGE_FIELDS.ID]: id, [MESSAGE_FIELDS.CONTENT]: content }
}

function successResponse<Data>(data: Data, status = 200): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status })
}

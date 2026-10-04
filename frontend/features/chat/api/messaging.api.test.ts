import {
    API_ROUTES,
    ERROR_CODES,
    MESSAGE_FIELDS,
    MESSAGE_PARAMS,
    MESSAGE_QUERY_PARAMS,
    MESSAGE_ROUTE_PATHS,
    type ApiEnvelope,
    type CursorPage,
    type MessageDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { HTTP_ERROR } from "../../../shared/http/ApiError"
import { listMessages, sendMessage } from "./messages.api"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const SENDER_ID = "507f1f77bcf86cd799439012"
const MESSAGE: MessageDto = {
    [MESSAGE_FIELDS.ID]: "507f1f77bcf86cd799439013",
    [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
    [MESSAGE_FIELDS.SENDER_ID]: SENDER_ID,
    [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: "client-message-001",
    [MESSAGE_FIELDS.CONTENT]: "Hello group",
    [MESSAGE_FIELDS.REPLY_TO]: null,
    [MESSAGE_FIELDS.MENTIONS]: [],
    [MESSAGE_FIELDS.ATTACHMENTS]: [],
    [MESSAGE_FIELDS.CREATED_AT]: "2026-10-04T12:00:00.000Z",
    [MESSAGE_FIELDS.UPDATED_AT]: "2026-10-04T12:00:00.000Z",
}

afterEach(() => vi.unstubAllGlobals())

describe("messaging API adapter", () => {
    it("should_send_the_client_message_id_and_normalize_the_message_dto", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(MESSAGE, 201))
        vi.stubGlobal("fetch", fetchMock)

        await expect(sendMessage({
            conversationId: CONVERSATION_ID,
            clientMessageId: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            content: MESSAGE[MESSAGE_FIELDS.CONTENT] ?? "",
        })).resolves.toEqual(MESSAGE)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(API_ROUTES.MESSAGES)
        expect(request.method).toBe("POST")
        expect(JSON.parse(String(request.body))).toEqual({
            [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
            [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            [MESSAGE_FIELDS.CONTENT]: MESSAGE[MESSAGE_FIELDS.CONTENT],
        })
    })

    it("should_list_a_contract_cursor_page_using_shared_query_names", async () => {
        const page: CursorPage<MessageDto> = { items: [MESSAGE], nextCursor: "older-cursor" }
        const fetchMock = vi.fn().mockResolvedValue(successResponse(page))
        vi.stubGlobal("fetch", fetchMock)

        await expect(listMessages({ conversationId: CONVERSATION_ID, cursor: page.nextCursor ?? undefined, limit: 10 }))
            .resolves.toEqual(page)

        const expectedPath = `${API_ROUTES.MESSAGES}${MESSAGE_ROUTE_PATHS.BY_CONVERSATION.replace(
            `:${MESSAGE_PARAMS.CONVERSATION_ID}`,
            CONVERSATION_ID,
        )}`
        const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), "https://linko.example")
        expect(requestUrl.pathname).toBe(expectedPath)
        expect(requestUrl.searchParams.get(MESSAGE_QUERY_PARAMS.CURSOR)).toBe("older-cursor")
        expect(requestUrl.searchParams.get(MESSAGE_QUERY_PARAMS.LIMIT)).toBe("10")
    })

    it("should_keep_a_failed_or_aborted_send_retryable_with_the_same_client_id", async () => {
        const fetchMock = vi.fn()
            .mockRejectedValueOnce(new DOMException("Request aborted", "AbortError"))
            .mockResolvedValueOnce(successResponse(MESSAGE, 201))
        vi.stubGlobal("fetch", fetchMock)
        const controller = new AbortController()

        const input = {
            conversationId: CONVERSATION_ID,
            clientMessageId: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            content: MESSAGE[MESSAGE_FIELDS.CONTENT] ?? "",
        }
        await expect(sendMessage({ ...input, signal: controller.signal }))
            .rejects.toMatchObject({ code: HTTP_ERROR.NETWORK, status: 0 })
        await expect(sendMessage(input)).resolves.toEqual(MESSAGE)

        const [, firstRequest] = fetchMock.mock.calls[0] as [string, RequestInit]
        const [, retryRequest] = fetchMock.mock.calls[1] as [string, RequestInit]
        expect(firstRequest.signal).toBe(controller.signal)
        expect(JSON.parse(String(retryRequest.body))[MESSAGE_FIELDS.CLIENT_MESSAGE_ID])
            .toBe(MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID])
    })

    it("should_preserve_server_business_error_codes", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.GROUP_CLOSED, message: "Group closed" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(failure), { status: 409 })))

        await expect(sendMessage({
            conversationId: CONVERSATION_ID,
            clientMessageId: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            content: MESSAGE[MESSAGE_FIELDS.CONTENT] ?? "",
        })).rejects.toMatchObject({ code: ERROR_CODES.GROUP_CLOSED, status: 409 })
    })
})

function successResponse<Data>(data: Data, status = 200): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status })
}

import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    CONVERSATION_ROUTE_PATHS,
    ERROR_CODES,
    READ_FIELDS,
    READ_REQUEST_FIELDS,
    type ApiEnvelope,
    type ReadStateDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { markConversationRead } from "./read.api"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const MESSAGE_ID = "507f1f77bcf86cd799439012"
const READ_STATE: ReadStateDto = {
    [READ_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
    [READ_FIELDS.LAST_READ_AT]: "2026-10-04T12:00:00.000Z",
    [READ_FIELDS.LAST_READ_MESSAGE_ID]: MESSAGE_ID,
    [READ_FIELDS.UNREAD_COUNT]: 0,
}

afterEach(() => vi.unstubAllGlobals())

describe("read-state API adapter", () => {
    it("should_send_the_last_visible_message_to_the_shared_read_route", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(READ_STATE))
        vi.stubGlobal("fetch", fetchMock)

        await expect(markConversationRead({
            conversationId: CONVERSATION_ID,
            lastVisibleMessageId: MESSAGE_ID,
        })).resolves.toEqual(READ_STATE)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(readPath())
        expect(request.method).toBe("PUT")
        expect(JSON.parse(String(request.body))).toEqual({
            [READ_REQUEST_FIELDS.LAST_VISIBLE_MESSAGE_ID]: MESSAGE_ID,
        })
    })

    it("should_preserve_server_business_error_codes", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.FORBIDDEN, message: "Current membership required" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify(failure), { status: 403 }),
        ))

        await expect(markConversationRead({
            conversationId: CONVERSATION_ID,
            lastVisibleMessageId: MESSAGE_ID,
        })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN, status: 403 })
    })
})

function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

function readPath(): string {
    return `${API_ROUTES.CONVERSATIONS}${CONVERSATION_ROUTE_PATHS.READ.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        CONVERSATION_ID,
    )}`
}

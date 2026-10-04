import {
    API_ROUTES,
    ERROR_CODES,
    MESSAGE_FIELDS,
    type ApiEnvelope,
    type MessageDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createMessageMultipartBody, sendMessage } from "./messages.api"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const SENDER_ID = "507f1f77bcf86cd799439012"
const REPLY_TARGET_ID = "507f1f77bcf86cd799439013"
const MENTION_ID = "507f1f77bcf86cd799439014"
const MESSAGE: MessageDto = {
    [MESSAGE_FIELDS.ID]: "507f1f77bcf86cd799439015",
    [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
    [MESSAGE_FIELDS.SENDER_ID]: SENDER_ID,
    [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: "reply-mention-client-message",
    [MESSAGE_FIELDS.CONTENT]: "A reply",
    [MESSAGE_FIELDS.REPLY_TO]: REPLY_TARGET_ID,
    [MESSAGE_FIELDS.MENTIONS]: [MENTION_ID],
    [MESSAGE_FIELDS.CREATED_AT]: "2026-10-04T12:00:00.000Z",
    [MESSAGE_FIELDS.UPDATED_AT]: "2026-10-04T12:00:00.000Z",
}

afterEach(() => vi.unstubAllGlobals())

describe("reply and mention API adapter", () => {
    it("should_serialize_reply_and_mentions_in_the_json_request", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(MESSAGE, 201))
        vi.stubGlobal("fetch", fetchMock)

        await expect(sendMessage({
            [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
            [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            [MESSAGE_FIELDS.CONTENT]: MESSAGE[MESSAGE_FIELDS.CONTENT] ?? "",
            [MESSAGE_FIELDS.REPLY_TO]: REPLY_TARGET_ID,
            [MESSAGE_FIELDS.MENTIONS]: [MENTION_ID],
        })).resolves.toEqual(MESSAGE)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(API_ROUTES.MESSAGES)
        expect(JSON.parse(String(request.body))).toEqual({
            [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
            [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            [MESSAGE_FIELDS.CONTENT]: MESSAGE[MESSAGE_FIELDS.CONTENT],
            [MESSAGE_FIELDS.REPLY_TO]: REPLY_TARGET_ID,
            [MESSAGE_FIELDS.MENTIONS]: [MENTION_ID],
        })
    })

    it("should_encode_the_same_reply_and_mentions_in_multipart_form_data", () => {
        const body = createMessageMultipartBody({
            [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
            [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            [MESSAGE_FIELDS.CONTENT]: MESSAGE[MESSAGE_FIELDS.CONTENT] ?? "",
            [MESSAGE_FIELDS.REPLY_TO]: REPLY_TARGET_ID,
            [MESSAGE_FIELDS.MENTIONS]: [MENTION_ID],
        })

        expect(body.get(MESSAGE_FIELDS.CONVERSATION_ID)).toBe(CONVERSATION_ID)
        expect(body.get(MESSAGE_FIELDS.CLIENT_MESSAGE_ID)).toBe(MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID])
        expect(body.get(MESSAGE_FIELDS.CONTENT)).toBe(MESSAGE[MESSAGE_FIELDS.CONTENT])
        expect(body.get(MESSAGE_FIELDS.REPLY_TO)).toBe(REPLY_TARGET_ID)
        expect(body.get(MESSAGE_FIELDS.MENTIONS)).toBe(JSON.stringify([MENTION_ID]))
    })

    it("should_preserve_the_server_reply_validation_error_code", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.INVALID_REPLY, message: "Reply target is not visible" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(failure), { status: 403 })))

        await expect(sendMessage({
            [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
            [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: MESSAGE[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            [MESSAGE_FIELDS.CONTENT]: MESSAGE[MESSAGE_FIELDS.CONTENT] ?? "",
            [MESSAGE_FIELDS.REPLY_TO]: REPLY_TARGET_ID,
        })).rejects.toMatchObject({ code: ERROR_CODES.INVALID_REPLY, status: 403 })
    })
})

function successResponse<Data>(data: Data, status = 200): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status })
}

import {
    API_ROUTES,
    ERROR_CODES,
    MESSAGE_FIELDS,
    PIN_PARAMS,
    PIN_ROUTE_PATHS,
    type ApiEnvelope,
    type PinnedMessageDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createGroupInfoQueryKey } from "../group.constants"
import { listPins, pinMessage, unpinMessage, type GroupInfoQueryInvalidator } from "./pins.api"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const MESSAGE_ID = "507f1f77bcf86cd799439012"
const SECOND_MESSAGE_ID = "507f1f77bcf86cd799439013"
const PINNED_MESSAGES: PinnedMessageDto[] = [
    createMessage(SECOND_MESSAGE_ID, "Newest pinned"),
    createMessage(MESSAGE_ID, "Earlier pinned"),
]

afterEach(() => vi.unstubAllGlobals())

describe("pins API adapter", () => {
    it("should_return_server_ordered_visible_pin_dtos", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(PINNED_MESSAGES))
        vi.stubGlobal("fetch", fetchMock)

        await expect(listPins(CONVERSATION_ID)).resolves.toEqual(PINNED_MESSAGES)

        expect(fetchMock.mock.calls[0]?.[0]).toBe(listPath())
        const request = fetchMock.mock.calls[0]?.[1] as RequestInit
        expect(request.method).toBeUndefined()
    })

    it("should_pin_and_invalidate_the_group_information_query", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(PINNED_MESSAGES))
        const queryInvalidator = createQueryInvalidator()
        vi.stubGlobal("fetch", fetchMock)

        await expect(pinMessage({ conversationId: CONVERSATION_ID, messageId: SECOND_MESSAGE_ID }, queryInvalidator))
            .resolves.toEqual(PINNED_MESSAGES)

        expect(fetchMock.mock.calls[0]?.[0]).toBe(messagePath())
        expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PUT" })
        expect(queryInvalidator.invalidateQueries).toHaveBeenCalledWith({
            queryKey: createGroupInfoQueryKey(CONVERSATION_ID),
        })
    })

    it("should_unpin_and_invalidate_the_group_information_query", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse([PINNED_MESSAGES[1]]))
        const queryInvalidator = createQueryInvalidator()
        vi.stubGlobal("fetch", fetchMock)

        await expect(unpinMessage({ conversationId: CONVERSATION_ID, messageId: SECOND_MESSAGE_ID }, queryInvalidator))
            .resolves.toEqual([PINNED_MESSAGES[1]])

        expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "DELETE" })
        expect(queryInvalidator.invalidateQueries).toHaveBeenCalledTimes(1)
    })

    it("should_preserve_the_api_error_code_and_skip_cache_invalidation_on_failure", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.INSUFFICIENT_ROLE, message: "Only admins may pin" },
            meta: null,
        }
        const queryInvalidator = createQueryInvalidator()
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(failure), { status: 403 })))

        await expect(pinMessage({ conversationId: CONVERSATION_ID, messageId: MESSAGE_ID }, queryInvalidator))
            .rejects.toMatchObject({ code: ERROR_CODES.INSUFFICIENT_ROLE, status: 403 })
        expect(queryInvalidator.invalidateQueries).not.toHaveBeenCalled()
    })
})

function createMessage(id: string, content: string): PinnedMessageDto {
    return {
        [MESSAGE_FIELDS.ID]: id,
        [MESSAGE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
        [MESSAGE_FIELDS.SENDER_ID]: "507f1f77bcf86cd799439014",
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: `pin-${id}`,
        [MESSAGE_FIELDS.CONTENT]: content,
        [MESSAGE_FIELDS.REPLY_TO]: null,
        [MESSAGE_FIELDS.MENTIONS]: [],
        [MESSAGE_FIELDS.ATTACHMENTS]: [],
        [MESSAGE_FIELDS.CREATED_AT]: "2026-10-04T13:00:00.000Z",
        [MESSAGE_FIELDS.UPDATED_AT]: "2026-10-04T13:00:00.000Z",
    }
}

function createQueryInvalidator(): GroupInfoQueryInvalidator {
    return { invalidateQueries: vi.fn().mockResolvedValue(undefined) }
}

function listPath(): string {
    return `${API_ROUTES.CONVERSATIONS}${PIN_ROUTE_PATHS.LIST.replace(
        `:${PIN_PARAMS.CONVERSATION_ID}`,
        CONVERSATION_ID,
    )}`
}

function messagePath(): string {
    return `${API_ROUTES.CONVERSATIONS}${PIN_ROUTE_PATHS.MESSAGE
        .replace(`:${PIN_PARAMS.CONVERSATION_ID}`, CONVERSATION_ID)
        .replace(`:${PIN_PARAMS.MESSAGE_ID}`, SECOND_MESSAGE_ID)}`
}

function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

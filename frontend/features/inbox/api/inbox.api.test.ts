import {
    API_ROUTES,
    CONVERSATION_KIND,
    CONVERSATION_DTO_FIELDS,
    CONVERSATION_QUERY_PARAMS,
    CONVERSATION_STATUS,
    CONVERSATION_TYPE,
    CURSOR_PAGE_FIELDS,
    ERROR_CODES,
    GROUP_FIELDS,
    INBOX_FIELDS,
    INBOX_LIMITS,
    type ApiEnvelope,
    type CursorPage,
    type InboxItemDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { listInbox } from "./inbox.api"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const INBOX_ITEM: InboxItemDto = {
    [INBOX_FIELDS.ID]: CONVERSATION_ID,
    [INBOX_FIELDS.TYPE]: CONVERSATION_TYPE.GROUP,
    [CONVERSATION_DTO_FIELDS.STATUS]: CONVERSATION_STATUS.CLOSED,
    [INBOX_FIELDS.PARTICIPANTS]: [],
    [INBOX_FIELDS.UNREAD_COUNT]: 3,
    [INBOX_FIELDS.LAST_MESSAGE]: null,
    [INBOX_FIELDS.GROUP]: {
        [GROUP_FIELDS.NAME]: "Readers",
        [GROUP_FIELDS.DESCRIPTION]: null,
        [GROUP_FIELDS.AVATAR_URL]: null,
    },
    [INBOX_FIELDS.CREATED_AT]: "2026-10-03T00:00:00.000Z",
    [INBOX_FIELDS.UPDATED_AT]: "2026-10-04T00:00:00.000Z",
}

afterEach(() => vi.unstubAllGlobals())

describe("inbox API adapter", () => {
    it("should_serialize_filter_cursor_and_page_size_and_unwrap_the_typed_page", async () => {
        const page: CursorPage<InboxItemDto> = { items: [INBOX_ITEM], nextCursor: "next-page-cursor" }
        const fetchMock = vi.fn().mockResolvedValue(successResponse(page))
        vi.stubGlobal("fetch", fetchMock)

        await expect(listInbox({
            kind: CONVERSATION_KIND.GROUP,
            cursor: "previous-page-cursor",
            limit: 12,
        })).resolves.toEqual(page)

        const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), "https://linko.example")
        expect(requestUrl.pathname).toBe(API_ROUTES.CONVERSATIONS)
        expect(requestUrl.searchParams.get(CONVERSATION_QUERY_PARAMS.KIND)).toBe(CONVERSATION_KIND.GROUP)
        expect(requestUrl.searchParams.get(CONVERSATION_QUERY_PARAMS.CURSOR)).toBe("previous-page-cursor")
        expect(requestUrl.searchParams.get(CONVERSATION_QUERY_PARAMS.LIMIT)).toBe("12")
    })

    it("should_use_the_shared_default_filter_and_page_size", async () => {
        const emptyPage: CursorPage<InboxItemDto> = {
            [CURSOR_PAGE_FIELDS.ITEMS]: [],
            [CURSOR_PAGE_FIELDS.NEXT_CURSOR]: null,
        }
        const fetchMock = vi.fn().mockResolvedValue(successResponse(emptyPage))
        vi.stubGlobal("fetch", fetchMock)

        await expect(listInbox()).resolves.toEqual(emptyPage)

        const requestUrl = new URL(String(fetchMock.mock.calls[0]?.[0]), "https://linko.example")
        expect(requestUrl.searchParams.get(CONVERSATION_QUERY_PARAMS.KIND)).toBe(CONVERSATION_KIND.ALL)
        expect(requestUrl.searchParams.get(CONVERSATION_QUERY_PARAMS.LIMIT))
            .toBe(String(INBOX_LIMITS.DEFAULT_PAGE_SIZE))
        expect(requestUrl.searchParams.has(CONVERSATION_QUERY_PARAMS.CURSOR)).toBe(false)
    })

    it("should_preserve_the_server_business_error_code", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.FORBIDDEN, message: "Current membership required" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify(failure), { status: 403 }),
        ))

        await expect(listInbox()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN, status: 403 })
    })
})

function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

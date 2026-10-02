import {
    API_ROUTES,
    CONVERSATION_DTO_FIELDS,
    CONVERSATION_PARAMS,
    CONVERSATION_ROUTE_PATHS,
    CONVERSATION_STATUS,
    ERROR_CODES,
    ROLE,
    type ApiEnvelope,
    type GroupDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { closeGroup, leaveGroup } from "./groupLifecycle.api"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const OWNER_ID = "507f1f77bcf86cd799439012"
const GROUP: GroupDto = {
    id: CONVERSATION_ID,
    ownerId: OWNER_ID,
    name: "Readers",
    description: null,
    avatarUrl: null,
    [CONVERSATION_DTO_FIELDS.STATUS]: CONVERSATION_STATUS.CLOSED,
    participants: [{ userId: OWNER_ID, role: ROLE.OWNER }],
    createdAt: "2026-10-03T00:00:00.000Z",
    updatedAt: "2026-10-04T00:00:00.000Z",
}

afterEach(() => vi.unstubAllGlobals())

describe("group lifecycle API adapter", () => {
    it("should_leave_a_group_through_the_shared_lifecycle_route", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(null))
        vi.stubGlobal("fetch", fetchMock)

        await expect(leaveGroup(CONVERSATION_ID)).resolves.toBeNull()

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(lifecyclePath(CONVERSATION_ROUTE_PATHS.LEAVE))
        expect(request.method).toBe("POST")
        expect(request.body).toBeUndefined()
    })

    it("should_close_a_group_and_return_the_shared_group_dto", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(GROUP))
        vi.stubGlobal("fetch", fetchMock)

        await expect(closeGroup(CONVERSATION_ID)).resolves.toEqual(GROUP)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(lifecyclePath(CONVERSATION_ROUTE_PATHS.CLOSE))
        expect(request.method).toBe("POST")
        expect(request.body).toBeUndefined()
    })

    it("should_preserve_the_owner_transfer_error_code", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.OWNER_TRANSFER_REQUIRED, message: "Transfer ownership first" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify(failure), { status: 409 }),
        ))

        await expect(leaveGroup(CONVERSATION_ID))
            .rejects.toMatchObject({ code: ERROR_CODES.OWNER_TRANSFER_REQUIRED, status: 409 })
    })
})

function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

function lifecyclePath(path: string): string {
    return `${API_ROUTES.CONVERSATIONS}${path.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        CONVERSATION_ID,
    )}`
}

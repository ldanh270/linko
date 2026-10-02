import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    ERROR_CODES,
    MEMBERSHIP_FIELDS,
    MEMBERSHIP_PARAMS,
    MEMBERSHIP_REQUEST_FIELDS,
    MEMBERSHIP_ROUTE_PATHS,
    ROLE,
    type ApiEnvelope,
    type MemberDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { changeRole, listMembers, removeMember, transferOwner } from "./membership.api"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const OWNER_ID = "507f1f77bcf86cd799439012"
const MEMBER_ID = "507f1f77bcf86cd799439013"
const MEMBER: MemberDto = {
    [MEMBERSHIP_FIELDS.USER_ID]: MEMBER_ID,
    [MEMBERSHIP_FIELDS.ROLE]: ROLE.MEMBER,
    [MEMBERSHIP_FIELDS.DISPLAY_NAME]: "Reader",
    [MEMBERSHIP_FIELDS.AVATAR_URL]: null,
    [MEMBERSHIP_FIELDS.JOINED_AT]: "2026-10-04T00:00:00.000Z",
}

/** Return one successful API response for membership adapter tests. */
function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

afterEach(() => vi.unstubAllGlobals())

describe("membership API adapter", () => {
    it("should_list_member_dtos_from_the_shared_route", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse([MEMBER]))
        vi.stubGlobal("fetch", fetchMock)

        await expect(listMembers(CONVERSATION_ID)).resolves.toEqual([MEMBER])

        expect(fetchMock.mock.calls[0]?.[0]).toBe(
            `${API_ROUTES.CONVERSATIONS}${MEMBERSHIP_ROUTE_PATHS.PARTICIPANTS.replace(`:${CONVERSATION_PARAMS.ID}`, CONVERSATION_ID)}`,
        )
    })

    it("should_send_the_contract_role_without_client_side_authorization_rules", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse({ ...MEMBER, [MEMBERSHIP_FIELDS.ROLE]: ROLE.ADMIN }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(changeRole({ conversationId: CONVERSATION_ID, userId: MEMBER_ID, role: ROLE.ADMIN }))
            .resolves.toMatchObject({ [MEMBERSHIP_FIELDS.ROLE]: ROLE.ADMIN })

        const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(memberPath(CONVERSATION_ID, MEMBER_ID))
        expect(options.method).toBe("PATCH")
        expect(options.body).toBe(JSON.stringify({ [MEMBERSHIP_REQUEST_FIELDS.ROLE]: ROLE.ADMIN }))
    })

    it("should_send_member_removal_and_owner_transfer_requests", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(successResponse(null))
            .mockResolvedValueOnce(successResponse(null))
        vi.stubGlobal("fetch", fetchMock)

        await expect(removeMember({ conversationId: CONVERSATION_ID, userId: MEMBER_ID })).resolves.toBeNull()
        await expect(transferOwner({ conversationId: CONVERSATION_ID, newOwnerId: MEMBER_ID })).resolves.toBeNull()

        expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("DELETE")
        expect(fetchMock.mock.calls[0]?.[0]).toBe(memberPath(CONVERSATION_ID, MEMBER_ID))
        expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST")
        expect(fetchMock.mock.calls[1]?.[0]).toBe(
            `${API_ROUTES.CONVERSATIONS}${MEMBERSHIP_ROUTE_PATHS.TRANSFER_OWNER.replace(`:${CONVERSATION_PARAMS.ID}`, CONVERSATION_ID)}`,
        )
        expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
            JSON.stringify({ [MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID]: MEMBER_ID }),
        )
    })

    it("should_preserve_the_server_insufficient_role_error_code", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.INSUFFICIENT_ROLE, message: "Permission denied" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(failure), { status: 403 })))

        await expect(removeMember({ conversationId: CONVERSATION_ID, userId: OWNER_ID }))
            .rejects.toMatchObject({ code: ERROR_CODES.INSUFFICIENT_ROLE, status: 403 })
    })
})

function memberPath(conversationId: string, userId: string): string {
    const path = MEMBERSHIP_ROUTE_PATHS.MEMBER
        .replace(`:${CONVERSATION_PARAMS.ID}`, conversationId)
        .replace(`:${MEMBERSHIP_PARAMS.USER_ID}`, userId)
    return `${API_ROUTES.CONVERSATIONS}${path}`
}

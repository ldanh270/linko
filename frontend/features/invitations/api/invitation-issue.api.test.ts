import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    ERROR_CODES,
    INVITATION_FIELDS,
    INVITATION_PARAMS,
    INVITATION_ROUTE_PATHS,
    type ApiEnvelope,
    type InvitationSummaryDto,
    type IssuedInvitationDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { issueInvitation, listInvitations, revokeInvitation } from "./invitations.api"

const GROUP_ID = "507f1f77bcf86cd799439011"
const INVITATION_ID = "507f1f77bcf86cd799439012"

const ISSUED_INVITATION: IssuedInvitationDto = {
    id: INVITATION_ID,
    url: "https://linko.example/invite/opaque-once",
    expiresAt: "2026-10-10T00:00:00.000Z",
    maxUses: 25,
    useCount: 0,
    createdAt: "2026-10-03T00:00:00.000Z",
}

const INVITATION_SUMMARY: InvitationSummaryDto = {
    id: INVITATION_ID,
    expiresAt: ISSUED_INVITATION.expiresAt,
    maxUses: ISSUED_INVITATION.maxUses,
    useCount: ISSUED_INVITATION.useCount,
    revokedAt: null,
    createdAt: ISSUED_INVITATION.createdAt,
}

afterEach(() => vi.unstubAllGlobals())

describe("invitation API adapter", () => {
    it("should_return_the_one_time_url_from_the_issue_response", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(ISSUED_INVITATION, 201))
        vi.stubGlobal("fetch", fetchMock)

        await expect(issueInvitation(GROUP_ID)).resolves.toEqual(ISSUED_INVITATION)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(invitationCollectionPath(GROUP_ID))
        expect(request.method).toBe("POST")
    })

    it("should_list_invitation_metadata_without_a_reusable_url", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse([INVITATION_SUMMARY], 200))
        vi.stubGlobal("fetch", fetchMock)

        const invitations = await listInvitations(GROUP_ID)

        expect(invitations).toEqual([INVITATION_SUMMARY])
        expect(Object.hasOwn(invitations[0] ?? {}, INVITATION_FIELDS.URL)).toBe(false)
        expect(fetchMock.mock.calls[0]?.[0]).toBe(invitationCollectionPath(GROUP_ID))
    })

    it("should_revoke_an_invitation_using_the_shared_route_contract", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(null, 200))
        vi.stubGlobal("fetch", fetchMock)

        await expect(revokeInvitation(GROUP_ID, INVITATION_ID)).resolves.toBeNull()

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(invitationByIdPath(GROUP_ID, INVITATION_ID))
        expect(request.method).toBe("DELETE")
    })

    it("should_preserve_the_api_error_code_from_a_failure_envelope", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.FORBIDDEN, message: "Access denied" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify(failure), { status: 403 }),
        ))

        await expect(listInvitations(GROUP_ID))
            .rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN, status: 403 })
    })
})

function invitationCollectionPath(groupId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${INVITATION_ROUTE_PATHS.COLLECTION.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        groupId,
    )}`
}

function invitationByIdPath(groupId: string, invitationId: string): string {
    return `${API_ROUTES.CONVERSATIONS}${INVITATION_ROUTE_PATHS.BY_ID
        .replace(`:${INVITATION_PARAMS.CONVERSATION_ID}`, groupId)
        .replace(`:${INVITATION_PARAMS.INVITATION_ID}`, invitationId)}`
}

function successResponse<Data>(data: Data, status: number): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status })
}

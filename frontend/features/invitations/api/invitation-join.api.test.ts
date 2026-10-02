import {
    API_ROUTES,
    ERROR_CODES,
    GROUP_FIELDS,
    INVITATION_PARAMS,
    INVITATION_PREVIEW_FIELDS,
    INVITATION_PREVIEW_ROUTE_PATHS,
    type ApiEnvelope,
    type GroupDto,
    type InvitationPreviewDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { acceptInvitation, previewInvitation } from "./invitations.api"

const TOKEN = "A".repeat(43)
const GROUP_ID = "507f1f77bcf86cd799439011"

const INVITATION_PREVIEW: InvitationPreviewDto = {
    [INVITATION_PREVIEW_FIELDS.GROUP_NAME]: "Preview group",
    [INVITATION_PREVIEW_FIELDS.GROUP_DESCRIPTION]: "Shared by invitation",
    [INVITATION_PREVIEW_FIELDS.GROUP_AVATAR_URL]: null,
    [INVITATION_PREVIEW_FIELDS.MEMBER_COUNT]: 3,
    [INVITATION_PREVIEW_FIELDS.EXPIRES_AT]: "2026-10-10T00:00:00.000Z",
}

const DESTINATION_GROUP: GroupDto = {
    [GROUP_FIELDS.ID]: GROUP_ID,
    [GROUP_FIELDS.OWNER_ID]: "507f1f77bcf86cd799439012",
    [GROUP_FIELDS.NAME]: "Preview group",
    [GROUP_FIELDS.DESCRIPTION]: "Shared by invitation",
    [GROUP_FIELDS.AVATAR_URL]: null,
    [GROUP_FIELDS.PARTICIPANTS]: [],
    [GROUP_FIELDS.CREATED_AT]: "2026-10-01T00:00:00.000Z",
    [GROUP_FIELDS.UPDATED_AT]: "2026-10-04T00:00:00.000Z",
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe("invitation join API adapter", () => {
    it("should_preview_without_persisting_the_raw_token", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(INVITATION_PREVIEW))
        vi.stubGlobal("fetch", fetchMock)
        const localStorageWrite = vi.spyOn(window.localStorage, "setItem")
        const sessionStorageWrite = vi.spyOn(window.sessionStorage, "setItem")

        await expect(previewInvitation(TOKEN)).resolves.toEqual(INVITATION_PREVIEW)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(previewPath(TOKEN))
        expect(request.cache).toBe("no-store")
        expect(localStorageWrite).not.toHaveBeenCalled()
        expect(sessionStorageWrite).not.toHaveBeenCalled()
        expect(JSON.stringify([localStorageWrite.mock.calls, sessionStorageWrite.mock.calls])).not.toContain(TOKEN)
    })

    it("should_return_the_destination_group_after_acceptance", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(DESTINATION_GROUP))
        vi.stubGlobal("fetch", fetchMock)

        const destination = await acceptInvitation(TOKEN)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(destination).toEqual(DESTINATION_GROUP)
        expect(url).toBe(acceptPath(TOKEN))
        expect(request.method).toBe("POST")
        expect(request.body).toBe("{}")
        expect(destination[GROUP_FIELDS.ID]).toBe(GROUP_ID)
    })

    it("should_preserve_the_invitation_error_code_from_the_api_envelope", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.INVITATION_UNAVAILABLE, message: "Unavailable" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
            new Response(JSON.stringify(failure), { status: 410 }),
        ))

        await expect(acceptInvitation(TOKEN))
            .rejects.toMatchObject({ code: ERROR_CODES.INVITATION_UNAVAILABLE, status: 410 })
    })
})

function previewPath(token: string): string {
    return `${API_ROUTES.INVITATIONS}${INVITATION_PREVIEW_ROUTE_PATHS.PREVIEW.replace(
        `:${INVITATION_PARAMS.TOKEN}`,
        token,
    )}`
}

function acceptPath(token: string): string {
    return `${API_ROUTES.INVITATIONS}${INVITATION_PREVIEW_ROUTE_PATHS.ACCEPT.replace(
        `:${INVITATION_PARAMS.TOKEN}`,
        token,
    )}`
}

function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

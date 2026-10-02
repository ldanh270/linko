import {
    API_ROUTES,
    CONVERSATION_DTO_FIELDS,
    CONVERSATION_ROUTE_PATHS,
    CONVERSATION_STATUS,
    ERROR_CODES,
    GROUP_FIELDS,
    type ApiEnvelope,
    type GroupDto,
    ROLE,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createGroup, updateGroup } from "./groups.api"

const GROUP_ID = "507f1f77bcf86cd799439011"
const OWNER_ID = "507f1f77bcf86cd799439012"

const GROUP: GroupDto = {
    id: GROUP_ID,
    ownerId: OWNER_ID,
    name: "Readers",
    description: null,
    avatarUrl: null,
    [CONVERSATION_DTO_FIELDS.STATUS]: CONVERSATION_STATUS.ACTIVE,
    participants: [{ userId: OWNER_ID, role: ROLE.OWNER }],
    createdAt: "2026-10-03T00:00:00.000Z",
    updatedAt: "2026-10-03T00:00:00.000Z",
}

afterEach(() => vi.unstubAllGlobals())

describe("group API adapter", () => {
    it("should_send_group_fields_as_multipart_when_an_avatar_is_present", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(GROUP, 201))
        vi.stubGlobal("fetch", fetchMock)
        const avatar = new File(["image-bytes"], "group.png", { type: "image/png" })

        await expect(createGroup({ name: GROUP.name, avatar })).resolves.toEqual(GROUP)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        const body = request.body as FormData
        expect(url).toBe(API_ROUTES.CONVERSATIONS)
        expect(body).toBeInstanceOf(FormData)
        expect(body.get(GROUP_FIELDS.NAME)).toBe(GROUP.name)
        expect(body.get(GROUP_FIELDS.AVATAR)).toBe(avatar)
        expect(new Headers(request.headers).has("Content-Type")).toBe(false)
    })

    it("should_send_group_fields_as_json_when_no_avatar_is_present", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(GROUP, 201))
        vi.stubGlobal("fetch", fetchMock)

        await createGroup({ name: GROUP.name, description: "Read together" })

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(API_ROUTES.CONVERSATIONS)
        expect(request.body).toBe(JSON.stringify({ name: GROUP.name, description: "Read together" }))
        expect(new Headers(request.headers).get("Content-Type")).toBe("application/json")
    })

    it("should_patch_group_metadata_and_return_the_group_dto", async () => {
        const updated: GroupDto = { ...GROUP, name: "Updated readers" }
        const fetchMock = vi.fn().mockResolvedValue(successResponse(updated, 200))
        vi.stubGlobal("fetch", fetchMock)

        await expect(updateGroup({ id: GROUP.id, name: updated.name })).resolves.toEqual(updated)

        const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(`${API_ROUTES.CONVERSATIONS}${CONVERSATION_ROUTE_PATHS.BY_ID.replace(":id", GROUP.id)}`)
        expect(request.method).toBe("PATCH")
        expect(request.body).toBe(JSON.stringify({ name: updated.name }))
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

        await expect(updateGroup({ id: GROUP.id, name: "Updated readers" }))
            .rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN, status: 403 })
    })
})

function successResponse<Data>(data: Data, status: number): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status })
}

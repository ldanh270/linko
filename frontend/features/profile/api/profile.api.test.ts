import { API_ROUTES, ERROR_CODES, USER_ROUTE_PARAMS, USER_ROUTE_PATHS, type ApiEnvelope, type ProfileDto, type PublicUserDto } from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getMine, getPublicUser, updateMine } from "./profile.api"

const USER_ID = "507f1f77bcf86cd799439011"
const PRIVATE_PROFILE: ProfileDto = {
    id: USER_ID,
    username: "reader",
    displayName: "Reader",
    email: "reader@example.com",
    phone: null,
    avatarUrl: null,
    backgroundUrl: null,
    bio: null,
}
const PUBLIC_PROFILE: PublicUserDto = {
    id: USER_ID,
    username: "reader",
    displayName: "Reader",
    avatarUrl: null,
    backgroundUrl: null,
    bio: null,
}

/** Return one successful API response for adapter contract tests. */
function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

afterEach(() => vi.unstubAllGlobals())

describe("profile API adapter", () => {
    it("should_get_private_and_public_profile_dtos_from_shared_routes", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(successResponse(PRIVATE_PROFILE))
            .mockResolvedValueOnce(successResponse(PUBLIC_PROFILE))
        vi.stubGlobal("fetch", fetchMock)

        await expect(getMine()).resolves.toEqual(PRIVATE_PROFILE)
        await expect(getPublicUser(USER_ID)).resolves.toEqual(PUBLIC_PROFILE)

        expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_ROUTES.USERS}${USER_ROUTE_PATHS.ME}`)
        expect(fetchMock.mock.calls[1]?.[0]).toBe(
            `${API_ROUTES.USERS}${USER_ROUTE_PATHS.BY_ID.replace(`:${USER_ROUTE_PARAMS.USER_ID}`, USER_ID)}`,
        )
    })

    it("should_send_profile_fields_and_both_images_as_multipart", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse(PRIVATE_PROFILE)))
        const avatar = new File(["avatar-bytes"], "avatar.webp", { type: "image/webp" })
        const background = new File(["background-bytes"], "background.png", { type: "image/png" })

        await expect(updateMine({
            username: "reader",
            displayName: "Updated reader",
            email: "reader@example.com",
            phone: null,
            bio: "New biography",
            removeBackground: true,
            avatar,
            background,
        })).resolves.toEqual(PRIVATE_PROFILE)

        const [url, request] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
        const body = request.body as FormData
        expect(url).toBe(`${API_ROUTES.USERS}${USER_ROUTE_PATHS.ME}`)
        expect(request.method).toBe("PATCH")
        expect(body).toBeInstanceOf(FormData)
        expect(body.get("username")).toBe("reader")
        expect(body.get("displayName")).toBe("Updated reader")
        expect(body.get("email")).toBe("reader@example.com")
        expect(body.get("phone")).toBe("")
        expect(body.get("bio")).toBe("New biography")
        expect(body.get("removeBackground")).toBe("true")
        expect(body.get("avatar")).toBe(avatar)
        expect(body.get("background")).toBe(background)
        expect(new Headers(request.headers).has("Content-Type")).toBe(false)
    })

    it("should_preserve_duplicate_email_api_error_code", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
            success: false,
            data: null,
            error: { code: ERROR_CODES.EMAIL_TAKEN, message: "Email already in use" },
            meta: null,
        }), { status: 409 })))

        await expect(updateMine({ email: "taken@example.com" }))
            .rejects.toMatchObject({ code: ERROR_CODES.EMAIL_TAKEN, status: 409 })
    })
})

import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    ERROR_CODES,
    NOTIFICATION_PREFERENCE_FIELDS,
    NOTIFICATION_PREFERENCE_REQUEST_FIELDS,
    NOTIFICATION_PREFERENCE_ROUTE_PATHS,
    type ApiEnvelope,
    type NotificationPreferenceDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getGroupNotificationPreference, setGroupMuted } from "./notification.api"

const CONVERSATION_ID = "507f1f77bcf86cd799439011"
const PREFERENCE: NotificationPreferenceDto = {
    [NOTIFICATION_PREFERENCE_FIELDS.CONVERSATION_ID]: CONVERSATION_ID,
    [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: true,
}

afterEach(() => vi.unstubAllGlobals())

describe("notification preference API adapter", () => {
    it("should_read_a_typed_preference_from_the_conversation_endpoint", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(PREFERENCE))
        vi.stubGlobal("fetch", fetchMock)

        await expect(getGroupNotificationPreference(CONVERSATION_ID)).resolves.toEqual(PREFERENCE)

        expect(fetchMock.mock.calls[0]?.[0]).toBe(preferencePath())
        const request = fetchMock.mock.calls[0]?.[1] as RequestInit
        expect(request.method).toBeUndefined()
    })

    it("should_update_only_the_requested_boolean_preference", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse({
            ...PREFERENCE,
            [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: false,
        }))
        vi.stubGlobal("fetch", fetchMock)

        await expect(setGroupMuted({ conversationId: CONVERSATION_ID, isMuted: false }))
            .resolves.toMatchObject({ [NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED]: false })

        expect(fetchMock.mock.calls[0]?.[0]).toBe(preferencePath())
        expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
            method: "PUT",
            body: JSON.stringify({ [NOTIFICATION_PREFERENCE_REQUEST_FIELDS.IS_MUTED]: false }),
        })
    })

    it("should_preserve_the_server_error_code", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.NOT_FOUND, message: "Conversation not found" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(failure), { status: 404 })))

        await expect(getGroupNotificationPreference(CONVERSATION_ID))
            .rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND, status: 404 })
    })
})

function preferencePath(): string {
    return `${API_ROUTES.CONVERSATIONS}${NOTIFICATION_PREFERENCE_ROUTE_PATHS.BY_CONVERSATION.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        CONVERSATION_ID,
    )}`
}

function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

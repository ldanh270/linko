import {
    API_ROUTES,
    ERROR_CODES,
    FRIEND_REQUEST_BODY_FIELDS,
    FRIEND_ROUTE_PATHS,
    USER_ROUTE_PATHS,
    USER_SEARCH_MODE,
    USER_SEARCH_QUERY_PARAMS,
    type ApiEnvelope,
    type DirectConversationDto,
    type FriendRequestDto,
} from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
    acceptFriend,
    declineFriend,
    listFriends,
    openDirectChat,
    requestFriend,
    searchPeople,
    unfriend,
} from "./people.api"

const FRIEND_ID = "507f1f77bcf86cd799439011"
const REQUEST_ID = "507f1f77bcf86cd799439012"
const FRIEND_REQUEST: FriendRequestDto = {
    id: REQUEST_ID,
    from: { id: FRIEND_ID, username: "mira", displayName: "Mira", avatarUrl: null, backgroundUrl: null, bio: null },
    to: { id: FRIEND_ID, username: "mira", displayName: "Mira", avatarUrl: null, backgroundUrl: null, bio: null },
    message: null,
    createdAt: "2026-10-04T00:00:00.000Z",
}
const DIRECT_CONVERSATION: DirectConversationDto = {
    id: "507f1f77bcf86cd799439013",
    type: "DIRECT",
    status: "ACTIVE",
    participants: [],
    createdAt: "2026-10-04T00:00:00.000Z",
    updatedAt: "2026-10-04T00:00:00.000Z",
}

afterEach(() => vi.unstubAllGlobals())

describe("people API adapter", () => {
    it("should_search_people_with_validated_query_parameters", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse([]))
        vi.stubGlobal("fetch", fetchMock)

        await searchPeople({ keyword: "mira chen", type: USER_SEARCH_MODE.FULL })

        const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(`${API_ROUTES.USERS}${USER_ROUTE_PATHS.SEARCH}?${USER_SEARCH_QUERY_PARAMS.KEYWORD}=mira+chen&${USER_SEARCH_QUERY_PARAMS.TYPE}=${USER_SEARCH_MODE.FULL}`)
        expect(options.method).toBeUndefined()
    })

    it("should_send_and_decide_friend_requests_on_distinct_routes", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(successResponse(FRIEND_REQUEST))
            .mockResolvedValueOnce(successResponse({ id: FRIEND_ID }))
            .mockResolvedValueOnce(successResponse(null))
        vi.stubGlobal("fetch", fetchMock)

        await expect(requestFriend({
            [FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID]: FRIEND_ID,
            [FRIEND_REQUEST_BODY_FIELDS.MESSAGE]: "Hello",
        })).resolves.toEqual(FRIEND_REQUEST)
        await expect(acceptFriend(REQUEST_ID)).resolves.toEqual({ id: FRIEND_ID })
        await expect(declineFriend(REQUEST_ID)).resolves.toBeNull()

        expect(fetchMock.mock.calls.map(([url, options]) => [url, (options as RequestInit).method])).toEqual([
            [API_ROUTES.FRIENDS, "POST"],
            [`${API_ROUTES.FRIENDS}${friendPath(FRIEND_ROUTE_PATHS.ACCEPT, REQUEST_ID)}`, "POST"],
            [`${API_ROUTES.FRIENDS}${friendPath(FRIEND_ROUTE_PATHS.DECLINE, REQUEST_ID)}`, "POST"],
        ])
    })

    it("should_list_friends_and_unfriend_through_the_shared_routes", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(successResponse([]))
            .mockResolvedValueOnce(successResponse(null))
        vi.stubGlobal("fetch", fetchMock)

        await expect(listFriends()).resolves.toEqual([])
        await expect(unfriend(FRIEND_ID)).resolves.toBeNull()

        expect(fetchMock.mock.calls[0]?.[0]).toBe(API_ROUTES.FRIENDS)
        expect(fetchMock.mock.calls[1]?.[0]).toBe(`${API_ROUTES.FRIENDS}${friendPath(FRIEND_ROUTE_PATHS.UNFRIEND, FRIEND_ID)}`)
    })

    it("should_open_the_existing_direct_conversation_for_a_friend", async () => {
        const fetchMock = vi.fn().mockResolvedValue(successResponse(DIRECT_CONVERSATION))
        vi.stubGlobal("fetch", fetchMock)

        await expect(openDirectChat(FRIEND_ID)).resolves.toEqual(DIRECT_CONVERSATION)

        const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(`${API_ROUTES.FRIENDS}${friendPath(FRIEND_ROUTE_PATHS.DIRECT_CONVERSATION, FRIEND_ID)}`)
        expect(options.method).toBe("POST")
    })

    it("should_preserve_not_friends_error_code_from_the_shared_client", async () => {
        const failure: ApiEnvelope<never> = {
            success: false,
            data: null,
            error: { code: ERROR_CODES.NOT_FRIENDS, message: "An active friendship is required" },
            meta: null,
        }
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(failure), { status: 403 })))

        await expect(openDirectChat(FRIEND_ID)).rejects.toMatchObject({ code: ERROR_CODES.NOT_FRIENDS, status: 403 })
    })
})

function successResponse<Data>(data: Data): Response {
    const envelope: ApiEnvelope<Data> = { success: true, data, error: null, meta: null }
    return new Response(JSON.stringify(envelope), { status: 200 })
}

function friendPath(route: string, identifier: string): string {
    return route.replace(/:\w+/, identifier)
}

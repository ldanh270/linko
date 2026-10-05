import {
    API_ROUTES,
    FRIEND_REQUEST_BODY_FIELDS,
    FRIEND_REQUEST_DIRECTION,
    FRIEND_ROUTE_PARAMS,
    FRIEND_ROUTE_PATHS,
    USER_ROUTE_PATHS,
    USER_SEARCH_MODE,
    USER_SEARCH_QUERY_PARAMS,
    type DirectConversationDto,
    type FriendDto,
    type FriendRequestDto,
    type FriendRequestDirection,
    type SendFriendRequestBody,
    type UserSearchMode,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

/** Public directory query accepted by the people search adapter. */
export interface SearchPeopleInput {
    readonly keyword: string
    readonly type?: UserSearchMode
}

/** Search public user profiles through validated URL query parameters. */
export function searchPeople(input: SearchPeopleInput): Promise<FriendDto[]> {
    const query = new URLSearchParams({
        [USER_SEARCH_QUERY_PARAMS.KEYWORD]: input.keyword,
        [USER_SEARCH_QUERY_PARAMS.TYPE]: input.type ?? USER_SEARCH_MODE.TYPING,
    })
    return authenticatedApiClient.request({
        path: `${API_ROUTES.USERS}${USER_ROUTE_PATHS.SEARCH}?${query.toString()}`,
    })
}

/** List safe public profiles for the authenticated user's current friends. */
export function listFriends(): Promise<FriendDto[]> {
    return authenticatedApiClient.request({ path: API_ROUTES.FRIENDS })
}

/** List incoming or sent friend requests for the signed-in account. */
export function listFriendRequests(direction: FriendRequestDirection): Promise<FriendRequestDto[]> {
    const suffix = direction === FRIEND_REQUEST_DIRECTION.RECEIVED
        ? FRIEND_ROUTE_PATHS.RECEIVED_REQUESTS
        : FRIEND_ROUTE_PATHS.SENT_REQUESTS
    return authenticatedApiClient.request({ path: `${API_ROUTES.FRIENDS}${suffix}` })
}

/** Send one friend request with an optional short note. */
export function requestFriend(input: SendFriendRequestBody): Promise<FriendRequestDto> {
    return authenticatedApiClient.request({
        path: API_ROUTES.FRIENDS,
        method: "POST",
        body: {
            [FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID]: input[FRIEND_REQUEST_BODY_FIELDS.RECIPIENT_ID],
            ...(input[FRIEND_REQUEST_BODY_FIELDS.MESSAGE] === undefined
                ? {}
                : { [FRIEND_REQUEST_BODY_FIELDS.MESSAGE]: input[FRIEND_REQUEST_BODY_FIELDS.MESSAGE] }),
        },
    })
}

/** Accept one pending incoming request. */
export function acceptFriend(requestId: string): Promise<FriendDto> {
    return authenticatedApiClient.request({
        path: friendRequestPath(FRIEND_ROUTE_PATHS.ACCEPT, requestId),
        method: "POST",
        body: {},
    })
}

/** Decline one pending incoming request. */
export function declineFriend(requestId: string): Promise<null> {
    return authenticatedApiClient.request({
        path: friendRequestPath(FRIEND_ROUTE_PATHS.DECLINE, requestId),
        method: "POST",
        body: {},
    })
}

/** Remove one active friend relationship. */
export function unfriend(friendId: string): Promise<null> {
    const path = FRIEND_ROUTE_PATHS.UNFRIEND.replace(`:${FRIEND_ROUTE_PARAMS.FRIEND_ID}`, friendId)
    return authenticatedApiClient.request({
        path: `${API_ROUTES.FRIENDS}${path}`,
        method: "DELETE",
    })
}

/** Open the active friend's canonical direct conversation. */
export function openDirectChat(friendId: string): Promise<DirectConversationDto> {
    const path = FRIEND_ROUTE_PATHS.DIRECT_CONVERSATION
        .replace(`:${FRIEND_ROUTE_PARAMS.FRIEND_ID}`, friendId)
    return authenticatedApiClient.request({
        path: `${API_ROUTES.FRIENDS}${path}`,
        method: "POST",
        body: {},
    })
}

function friendRequestPath(route: string, requestId: string): string {
    const path = route.replace(`:${FRIEND_ROUTE_PARAMS.REQUEST_ID}`, requestId)
    return `${API_ROUTES.FRIENDS}${path}`
}

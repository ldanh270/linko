import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    CONVERSATION_ROUTE_PATHS,
    type GroupDto,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

const CONVERSATION_ENDPOINT = API_ROUTES.CONVERSATIONS

/** Leave a group and return only after the server has revoked membership access.
 *
 * @param conversationId - MongoDB conversation identifier for the group.
 * @returns `null` after a successful leave or a normalized API error.
 */
export function leaveGroup(conversationId: string): Promise<null> {
    return authenticatedApiClient.request<null>({
        path: lifecyclePath(CONVERSATION_ROUTE_PATHS.LEAVE, conversationId),
        method: "POST",
    })
}

/** Close a group and return its safe terminal representation.
 *
 * @param conversationId - MongoDB conversation identifier for the group.
 * @returns The closed group DTO or a normalized API error.
 */
export function closeGroup(conversationId: string): Promise<GroupDto> {
    return authenticatedApiClient.request<GroupDto>({
        path: lifecyclePath(CONVERSATION_ROUTE_PATHS.CLOSE, conversationId),
        method: "POST",
    })
}

function lifecyclePath(route: string, conversationId: string): string {
    return `${CONVERSATION_ENDPOINT}${route.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        conversationId,
    )}`
}

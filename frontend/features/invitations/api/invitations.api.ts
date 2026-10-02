import {
    API_ROUTES,
    INVITATION_PARAMS,
    INVITATION_ROUTE_PATHS,
    type InvitationSummaryDto,
    type IssuedInvitationDto,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

/** Create one fresh invitation and return its one-time URL to the caller. */
export function issueInvitation(conversationId: string): Promise<IssuedInvitationDto> {
    return authenticatedApiClient.request<IssuedInvitationDto>({
        path: invitationCollectionPath(conversationId),
        method: "POST",
        body: {},
    })
}

/** List safe invitation metadata without recovering previously issued URLs. */
export function listInvitations(conversationId: string): Promise<InvitationSummaryDto[]> {
    return authenticatedApiClient.request<InvitationSummaryDto[]>({
        path: invitationCollectionPath(conversationId),
    })
}

/** Revoke one invitation and return the API's empty success value. */
export function revokeInvitation(conversationId: string, invitationId: string): Promise<null> {
    return authenticatedApiClient.request<null>({
        path: invitationPath(conversationId, invitationId),
        method: "DELETE",
    })
}

/** Build the collection endpoint from shared conversation and invitation paths. */
function invitationCollectionPath(conversationId: string): string {
    const path = INVITATION_ROUTE_PATHS.COLLECTION.replace(
        `:${INVITATION_PARAMS.CONVERSATION_ID}`,
        conversationId,
    )
    return `${API_ROUTES.CONVERSATIONS}${path}`
}

/** Build the single invitation endpoint from shared route parameter names. */
function invitationPath(conversationId: string, invitationId: string): string {
    const path = INVITATION_ROUTE_PATHS.BY_ID
        .replace(`:${INVITATION_PARAMS.CONVERSATION_ID}`, conversationId)
        .replace(`:${INVITATION_PARAMS.INVITATION_ID}`, invitationId)
    return `${API_ROUTES.CONVERSATIONS}${path}`
}

import {
    API_ROUTES,
    INVITATION_HEADERS,
    INVITATION_PARAMS,
    INVITATION_PREVIEW_ROUTE_PATHS,
    INVITATION_ROUTE_PATHS,
    type GroupDto,
    type InvitationPreviewDto,
    type InvitationSummaryDto,
    type IssuedInvitationDto,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"
import { apiClient } from "../../../shared/http/client"

/** Issue with a stable key so retries cannot rotate twice; only the first response has the URL. */
export function issueInvitation(
    conversationId: string,
    idempotencyKey: string,
): Promise<IssuedInvitationDto> {
    return authenticatedApiClient.request<IssuedInvitationDto>({
        path: invitationCollectionPath(conversationId),
        method: "POST",
        headers: { [INVITATION_HEADERS.IDEMPOTENCY_KEY]: idempotencyKey },
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

/**
 * Load safe public group details without retaining the URL token in browser storage or cache.
 *
 * @param rawToken - URL-safe token supplied by the invitation route.
 * @returns Minimal public group details for the preview screen.
 */
export function previewInvitation(rawToken: string): Promise<InvitationPreviewDto> {
    return apiClient.request<InvitationPreviewDto>({
        path: invitationTokenPath(INVITATION_PREVIEW_ROUTE_PATHS.PREVIEW, rawToken),
        cache: "no-store",
    })
}

/**
 * Accept an invitation for the current authenticated account.
 *
 * @param rawToken - URL-safe token supplied by the invitation route.
 * @returns The group DTO to open after joining.
 */
export function acceptInvitation(rawToken: string): Promise<GroupDto> {
    return authenticatedApiClient.request<GroupDto>({
        path: invitationTokenPath(INVITATION_PREVIEW_ROUTE_PATHS.ACCEPT, rawToken),
        method: "POST",
        body: {},
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

/** Build a token-scoped route while keeping the parameter name in the shared contract. */
function invitationTokenPath(routePath: string, rawToken: string): string {
    const path = routePath.replace(`:${INVITATION_PARAMS.TOKEN}`, rawToken)
    return `${API_ROUTES.INVITATIONS}${path}`
}

import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    MEMBERSHIP_PARAMS,
    MEMBERSHIP_REQUEST_FIELDS,
    MEMBERSHIP_ROUTE_PATHS,
    type ChangeMemberRoleRequest,
    type MemberDto,
    type TransferOwnerRequest,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

/** Change-role fields augmented with the group and target path identifiers. */
export interface ChangeRoleInput extends ChangeMemberRoleRequest {
    readonly conversationId: string
    readonly userId: string
}

/** Member-removal identifiers required by the authenticated route. */
export interface RemoveMemberInput {
    readonly conversationId: string
    readonly userId: string
}

/** Owner-transfer fields augmented with the group path identifier. */
export interface TransferOwnerInput extends TransferOwnerRequest {
    readonly conversationId: string
}

const CONVERSATION_ENDPOINT = API_ROUTES.CONVERSATIONS

/** List safe member DTOs for a group; server membership checks remain authoritative.
 *
 * @param conversationId - MongoDB group conversation identifier.
 * @returns Safe member DTOs or a normalized shared-client error.
 */
export function listMembers(conversationId: string): Promise<MemberDto[]> {
    return authenticatedApiClient.request({ path: `${CONVERSATION_ENDPOINT}${conversationPath(conversationId)}` })
}

/** Send a requested member role to the server for authorization and persistence.
 *
 * @param input - Target group, member, and requested role.
 * @returns The updated safe member DTO.
 */
export function changeRole(input: ChangeRoleInput): Promise<MemberDto> {
    return authenticatedApiClient.request({
        path: `${CONVERSATION_ENDPOINT}${memberPath(input.conversationId, input.userId)}`,
        method: "PATCH",
        body: { [MEMBERSHIP_REQUEST_FIELDS.ROLE]: input.role },
    })
}

/** Remove a member through the authenticated group membership route.
 *
 * @param input - Target group and member identifiers.
 * @returns `null` after successful removal.
 */
export function removeMember(input: RemoveMemberInput): Promise<null> {
    return authenticatedApiClient.request({
        path: `${CONVERSATION_ENDPOINT}${memberPath(input.conversationId, input.userId)}`,
        method: "DELETE",
    })
}

/** Request an ownership transfer to a current group participant.
 *
 * @param input - Group and current member receiving ownership.
 * @returns `null` after a successful transfer.
 */
export function transferOwner(input: TransferOwnerInput): Promise<null> {
    return authenticatedApiClient.request({
        path: `${CONVERSATION_ENDPOINT}${MEMBERSHIP_ROUTE_PATHS.TRANSFER_OWNER.replace(
            `:${CONVERSATION_PARAMS.ID}`,
            input.conversationId,
        )}`,
        method: "POST",
        body: { [MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID]: input.newOwnerId },
    })
}

function conversationPath(conversationId: string): string {
    return MEMBERSHIP_ROUTE_PATHS.PARTICIPANTS.replace(`:${CONVERSATION_PARAMS.ID}`, conversationId)
}

function memberPath(conversationId: string, userId: string): string {
    return MEMBERSHIP_ROUTE_PATHS.MEMBER
        .replace(`:${CONVERSATION_PARAMS.ID}`, conversationId)
        .replace(`:${MEMBERSHIP_PARAMS.USER_ID}`, userId)
}

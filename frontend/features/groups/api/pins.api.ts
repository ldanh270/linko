import {
    API_ROUTES,
    PIN_PARAMS,
    PIN_ROUTE_PATHS,
    type PinnedMessageDto,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"
import { createGroupInfoQueryKey } from "../group.constants"

/** Identifiers accepted by a group pin mutation. */
export interface PinMessageInput {
    readonly conversationId: string
    readonly messageId: string
}

/** Query cache collaborator invalidated after a successful pin mutation. */
export interface GroupInfoQueryInvalidator {
    /** Invalidate queries that share the provided stable query key. */
    invalidateQueries(filters: { readonly queryKey: readonly unknown[] }): Promise<unknown>
}

const CONVERSATION_ENDPOINT = API_ROUTES.CONVERSATIONS

/** Read ordered pin DTOs visible to the current group member. */
export function listPins(conversationId: string): Promise<PinnedMessageDto[]> {
    return authenticatedApiClient.request<PinnedMessageDto[]>({
        path: listPath(conversationId),
    })
}

/** Pin one group message and invalidate its cached group information. */
export async function pinMessage(
    input: PinMessageInput,
    queryInvalidator: GroupInfoQueryInvalidator,
): Promise<PinnedMessageDto[]> {
    const pins = await authenticatedApiClient.request<PinnedMessageDto[]>({
        path: messagePath(input),
        method: "PUT",
    })
    await invalidateGroupInfo(queryInvalidator, input.conversationId)
    return pins
}

/** Remove one group pin and invalidate its cached group information. */
export async function unpinMessage(
    input: PinMessageInput,
    queryInvalidator: GroupInfoQueryInvalidator,
): Promise<PinnedMessageDto[]> {
    const pins = await authenticatedApiClient.request<PinnedMessageDto[]>({
        path: messagePath(input),
        method: "DELETE",
    })
    await invalidateGroupInfo(queryInvalidator, input.conversationId)
    return pins
}

async function invalidateGroupInfo(
    queryInvalidator: GroupInfoQueryInvalidator,
    conversationId: string,
): Promise<void> {
    await queryInvalidator.invalidateQueries({ queryKey: createGroupInfoQueryKey(conversationId) })
}

function listPath(conversationId: string): string {
    return `${CONVERSATION_ENDPOINT}${PIN_ROUTE_PATHS.LIST.replace(
        `:${PIN_PARAMS.CONVERSATION_ID}`,
        conversationId,
    )}`
}

function messagePath(input: PinMessageInput): string {
    return `${CONVERSATION_ENDPOINT}${PIN_ROUTE_PATHS.MESSAGE
        .replace(`:${PIN_PARAMS.CONVERSATION_ID}`, input.conversationId)
        .replace(`:${PIN_PARAMS.MESSAGE_ID}`, input.messageId)}`
}

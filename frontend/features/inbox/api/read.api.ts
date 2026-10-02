import {
    API_ROUTES,
    CONVERSATION_PARAMS,
    CONVERSATION_ROUTE_PATHS,
    READ_REQUEST_FIELDS,
    type MarkConversationReadRequest,
    type ReadStateDto,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

/** Request data needed to advance the read cursor for one conversation. */
export interface MarkConversationReadInput extends MarkConversationReadRequest {
    readonly conversationId: string
    readonly signal?: AbortSignal
}

/** Advance the current user's read cursor through the last visible message.
 *
 * Inbox query invalidation remains with the consuming screen hook so this adapter stays transport-only.
 *
 * @param input - Conversation identifier, last visible message identifier, and optional cancellation signal.
 * @returns The server's read-state DTO or a normalized shared-client error.
 */
export function markConversationRead(input: MarkConversationReadInput): Promise<ReadStateDto> {
    const route = CONVERSATION_ROUTE_PATHS.READ.replace(
        `:${CONVERSATION_PARAMS.ID}`,
        input.conversationId,
    )
    const body: MarkConversationReadRequest = {
        [READ_REQUEST_FIELDS.LAST_VISIBLE_MESSAGE_ID]: input.lastVisibleMessageId,
    }
    return authenticatedApiClient.request<ReadStateDto>({
        path: `${API_ROUTES.CONVERSATIONS}${route}`,
        method: "PUT",
        body,
        signal: input.signal,
    })
}

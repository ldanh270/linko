import {
    API_ROUTES,
    CONVERSATION_KIND,
    CONVERSATION_QUERY_PARAMS,
    INBOX_LIMITS,
    type ConversationKind,
    type CursorPage,
    type InboxItemDto,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

/** Optional server-side inbox filters accepted by the browser adapter. */
export interface ListInboxOptions {
    readonly kind?: ConversationKind
    readonly cursor?: string
    readonly limit?: number
    readonly signal?: AbortSignal
}

/** Load one typed inbox page while leaving pagination state to the consuming hook.
 *
 * @param options - Optional conversation kind, stable cursor, page size, and cancellation signal.
 * @returns A cursor page of safe inbox items or a normalized shared-client error.
 */
export function listInbox(options: ListInboxOptions = {}): Promise<CursorPage<InboxItemDto>> {
    const query = new URLSearchParams({
        [CONVERSATION_QUERY_PARAMS.KIND]: options.kind ?? CONVERSATION_KIND.ALL,
        [CONVERSATION_QUERY_PARAMS.LIMIT]: String(options.limit ?? INBOX_LIMITS.DEFAULT_PAGE_SIZE),
    })
    if (options.cursor) query.set(CONVERSATION_QUERY_PARAMS.CURSOR, options.cursor)
    return authenticatedApiClient.request<CursorPage<InboxItemDto>>({
        path: `${API_ROUTES.CONVERSATIONS}?${query.toString()}`,
        signal: options.signal,
    })
}

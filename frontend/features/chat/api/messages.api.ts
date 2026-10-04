import {
    API_ROUTES,
    MESSAGE_FIELDS,
    MESSAGE_LIMITS,
    MESSAGE_PARAMS,
    MESSAGE_QUERY_PARAMS,
    MESSAGE_ROUTE_PATHS,
    type CursorPage,
    type MessageDto,
    type SendMessageRequest,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

/** Browser send fields augmented with cancellation for screen-owned retry state. */
export interface SendMessageInput extends SendMessageRequest {
    readonly signal?: AbortSignal
}

/** Conversation history query accepted by the message API adapter. */
export interface ListMessagesInput {
    readonly conversationId: string
    readonly cursor?: string
    readonly limit?: number
    readonly signal?: AbortSignal
}

const MESSAGE_ENDPOINT = API_ROUTES.MESSAGES

/** Send message content and optional references with the caller's stable retry key.
 *
 * @param input - Message content, target conversation, idempotency key, and optional abort signal.
 * @returns The persisted message DTO or a normalized shared-client error.
 */
export function sendMessage(input: SendMessageInput): Promise<MessageDto> {
    const body: SendMessageRequest = {
        [MESSAGE_FIELDS.CONVERSATION_ID]: input.conversationId,
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: input.clientMessageId,
        [MESSAGE_FIELDS.CONTENT]: input.content,
        ...(input.replyTo === undefined ? {} : { [MESSAGE_FIELDS.REPLY_TO]: input.replyTo }),
        ...(input.mentions === undefined ? {} : { [MESSAGE_FIELDS.MENTIONS]: input.mentions }),
    }
    return authenticatedApiClient.request<MessageDto>({
        path: MESSAGE_ENDPOINT,
        method: "POST",
        body,
        signal: input.signal,
    })
}

/** Serialize a message request using the same field names for a multipart upload body.
 *
 * Mentions use JSON encoding in multipart data so the server can validate them as one array.
 *
 * @param input - Shared message fields, including optional reply and mention references.
 * @returns FormData containing the scalar message fields and serialized mention IDs.
 */
export function createMessageMultipartBody(input: SendMessageRequest): FormData {
    const body = new FormData()
    body.set(MESSAGE_FIELDS.CONVERSATION_ID, input.conversationId)
    body.set(MESSAGE_FIELDS.CLIENT_MESSAGE_ID, input.clientMessageId)
    if (input.content !== undefined) body.set(MESSAGE_FIELDS.CONTENT, input.content)
    if (input.replyTo !== undefined) body.set(MESSAGE_FIELDS.REPLY_TO, input.replyTo)
    if (input.mentions !== undefined) body.set(MESSAGE_FIELDS.MENTIONS, JSON.stringify(input.mentions))
    return body
}

/** Read one cursor page while leaving loading and retry state to the caller's hook.
 *
 * @param input - Conversation identifier, optional cursor, page size, and abort signal.
 * @returns Safe chronological messages and the cursor for older history.
 */
export function listMessages(input: ListMessagesInput): Promise<CursorPage<MessageDto>> {
    const query = new URLSearchParams({
        [MESSAGE_QUERY_PARAMS.LIMIT]: String(input.limit ?? MESSAGE_LIMITS.DEFAULT_PAGE_SIZE),
    })
    if (input.cursor) query.set(MESSAGE_QUERY_PARAMS.CURSOR, input.cursor)
    const path = MESSAGE_ROUTE_PATHS.BY_CONVERSATION.replace(
        `:${MESSAGE_PARAMS.CONVERSATION_ID}`,
        input.conversationId,
    )
    return authenticatedApiClient.request<CursorPage<MessageDto>>({
        path: `${MESSAGE_ENDPOINT}${path}?${query.toString()}`,
        signal: input.signal,
    })
}

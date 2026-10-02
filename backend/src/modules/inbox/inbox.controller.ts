import {
    CONVERSATION_KIND,
    CONVERSATION_QUERY_PARAMS,
    INBOX_LIMITS,
    type ApiEnvelope,
    type ConversationKind,
    type CursorPage,
    type InboxItemDto,
} from "@linko/contracts"
import type { RequestHandler } from "express"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { INBOX_OPERATION_FIELDS } from "./inbox.constants"
import { InboxService } from "./inbox.service"

type InboxRequestHandler = RequestHandler<
    Record<string, string>,
    ApiEnvelope<CursorPage<InboxItemDto>>,
    Record<string, never>
>

/** Translate validated inbox HTTP filters into one authenticated service call.
 *
 * @layer Controller
 */
export class InboxController {
    /** Bind the inbox use case without coupling it to Express request state. */
    constructor(private readonly service: InboxService) {}

    /** Return the current user's bounded conversation page. */
    readonly list: InboxRequestHandler = async (request, response) => {
        const rawKind = request.query[INBOX_OPERATION_FIELDS.KIND]
        const rawCursor = request.query[INBOX_OPERATION_FIELDS.CURSOR]
        const rawLimit = request.query[INBOX_OPERATION_FIELDS.LIMIT]
        const page = await this.service.list({
            userId: request.user._id,
            kind: toConversationKind(rawKind),
            cursor: typeof rawCursor === "string" ? rawCursor : undefined,
            limit: Number(rawLimit ?? INBOX_LIMITS.DEFAULT_PAGE_SIZE),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(page))
    }
}

function toConversationKind(value: unknown): ConversationKind {
    if (value === CONVERSATION_KIND.GROUP) return CONVERSATION_KIND.GROUP
    if (value === CONVERSATION_KIND.DIRECT) return CONVERSATION_KIND.DIRECT
    return CONVERSATION_KIND.ALL
}

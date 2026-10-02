import {
    CONVERSATION_KIND,
    CONVERSATION_QUERY_PARAMS,
    INBOX_LIMITS,
} from "@linko/contracts"
import zod from "zod"

/** Validate an inbox filter, optional opaque cursor, and bounded page size. */
export const listInboxSchema = zod.object({
    query: zod.object({
        [CONVERSATION_QUERY_PARAMS.KIND]: zod.enum(CONVERSATION_KIND).default(CONVERSATION_KIND.ALL),
        [CONVERSATION_QUERY_PARAMS.CURSOR]: zod.string().max(INBOX_LIMITS.MAX_CURSOR_LENGTH).optional(),
        [CONVERSATION_QUERY_PARAMS.LIMIT]: zod.coerce.number()
            .int()
            .min(1)
            .max(INBOX_LIMITS.MAX_PAGE_SIZE)
            .default(INBOX_LIMITS.DEFAULT_PAGE_SIZE),
    }).strict(),
})

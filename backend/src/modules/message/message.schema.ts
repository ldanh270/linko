import {
    MESSAGE_FIELDS,
    MESSAGE_LIMITS,
    MESSAGE_PARAMS,
    MESSAGE_QUERY_PARAMS,
} from "@linko/contracts"
import zod from "zod"

import { REGEX } from "../../configs/constants/regex"

/** Validate a content-only message request and its stable client retry key. */
export const sendMessageSchema = zod.object({
    body: zod.object({
        [MESSAGE_FIELDS.CONVERSATION_ID]: zod.string().regex(REGEX.MONGO_ID),
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: zod.string()
            .trim()
            .min(1)
            .max(MESSAGE_LIMITS.CLIENT_MESSAGE_ID_LENGTH),
        [MESSAGE_FIELDS.CONTENT]: zod.string()
            .trim()
            .min(1)
            .max(MESSAGE_LIMITS.MAX_CONTENT_LENGTH),
    }).strict(),
})

/** Validate a conversation history route and its bounded cursor query. */
export const listMessagesSchema = zod.object({
    params: zod.object({
        [MESSAGE_PARAMS.CONVERSATION_ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
    query: zod.object({
        [MESSAGE_QUERY_PARAMS.CURSOR]: zod.string().max(MESSAGE_LIMITS.MAX_CURSOR_LENGTH).optional(),
        [MESSAGE_QUERY_PARAMS.LIMIT]: zod.coerce.number()
            .int()
            .min(1)
            .max(MESSAGE_LIMITS.MAX_PAGE_SIZE)
            .default(MESSAGE_LIMITS.DEFAULT_PAGE_SIZE),
    }),
})

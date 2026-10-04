import {
    MESSAGE_FIELDS,
    MESSAGE_LIMITS,
    MESSAGE_PARAMS,
    MESSAGE_QUERY_PARAMS,
} from "@linko/contracts"
import zod from "zod"

import { REGEX } from "../../configs/constants/regex"

/** Validate a message request, optional references, and its stable retry key. */
const mentionIdsSchema = zod.preprocess((value: unknown) => {
    if (typeof value !== "string") return value
    try {
        return JSON.parse(value)
    } catch {
        return value
    }
}, zod.array(zod.string().regex(REGEX.MONGO_ID)).max(MESSAGE_LIMITS.MAX_MENTIONS).optional())

/** Validate JSON and multipart message requests with optional text when files are attached. */
export const sendMessageSchema = zod.object({
    body: zod.object({
        [MESSAGE_FIELDS.CONVERSATION_ID]: zod.string().regex(REGEX.MONGO_ID).optional(),
        [MESSAGE_FIELDS.RECIPIENT_ID]: zod.string().regex(REGEX.MONGO_ID).optional(),
        [MESSAGE_FIELDS.CLIENT_MESSAGE_ID]: zod.string()
            .trim()
            .min(1)
            .max(MESSAGE_LIMITS.CLIENT_MESSAGE_ID_LENGTH),
        [MESSAGE_FIELDS.CONTENT]: zod.string().trim().max(MESSAGE_LIMITS.MAX_CONTENT_LENGTH).optional(),
        [MESSAGE_FIELDS.REPLY_TO]: zod.string().regex(REGEX.MONGO_ID).optional(),
        [MESSAGE_FIELDS.MENTIONS]: mentionIdsSchema,
    }).strict().refine(
        (body) => (body[MESSAGE_FIELDS.CONVERSATION_ID] !== undefined)
            !== (body[MESSAGE_FIELDS.RECIPIENT_ID] !== undefined),
    ),
})

/** Validate a conversation history route and its bounded cursor query. */
export const listMessagesSchema = zod.object({
    params: zod.object({
        [MESSAGE_PARAMS.CONVERSATION_ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
    query: zod.object({
        [MESSAGE_QUERY_PARAMS.CURSOR]: zod.string().max(MESSAGE_LIMITS.MAX_CURSOR_LENGTH).optional(),
        [MESSAGE_QUERY_PARAMS.AFTER_MESSAGE_ID]: zod.string().regex(REGEX.MONGO_ID).optional(),
        [MESSAGE_QUERY_PARAMS.LIMIT]: zod.coerce.number()
            .int()
            .min(1)
            .max(MESSAGE_LIMITS.MAX_PAGE_SIZE)
            .default(MESSAGE_LIMITS.DEFAULT_PAGE_SIZE),
    }).refine((query) => !(query.cursor && query.afterMessageId)),
})

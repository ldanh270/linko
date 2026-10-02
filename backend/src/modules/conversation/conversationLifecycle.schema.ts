import { CONVERSATION_PARAMS } from "@linko/contracts"
import zod from "zod"

import { REGEX } from "../../configs/constants/regex"

const emptyBodySchema = zod.object({}).strict().optional()
const emptyQuerySchema = zod.object({}).strict()

/** Validate a group identifier and empty body for a participant departure. */
export const leaveGroupSchema = zod.object({
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
    }).strict(),
    body: emptyBodySchema,
    query: emptyQuerySchema,
})

/** Validate a group identifier and empty body for owner-only closure. */
export const closeGroupSchema = zod.object({
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
    }).strict(),
    body: emptyBodySchema,
    query: emptyQuerySchema,
})

import { MESSAGE_LIMITS, POLL_MODE, UTILITY_LIMITS } from "@linko/contracts"
import { z } from "zod"
import { REGEX } from "../../configs/constants/regex"

const identifier = z.string().regex(REGEX.MONGO_ID)
const params = z.object({ id: identifier, resourceId: identifier.optional() })
const options = z.array(z.string().trim().min(1).max(UTILITY_LIMITS.OPTION)).min(UTILITY_LIMITS.MIN_OPTIONS).max(UTILITY_LIMITS.MAX_OPTIONS)
    .refine((values) => new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length, "Poll options must be distinct")

/** Validate normalized creation fields before the poll service sees a request. */
export const pollCreateSchema = z.object({ params, body: z.object({
    clientMessageId: z.string().min(1).max(MESSAGE_LIMITS.CLIENT_MESSAGE_ID_LENGTH),
    question: z.string().trim().min(1).max(UTILITY_LIMITS.QUESTION), options,
    mode: z.enum([POLL_MODE.SINGLE, POLL_MODE.MULTIPLE]), closesAt: z.iso.datetime({ offset: true }).nullable().optional(),
}) })
/** Validate conversation and resource identifiers on read and close routes. */
export const pollResourceSchema = z.object({ params: z.object({ id: identifier, resourceId: identifier }) })
/** Validate a conversation identifier for bounded poll listing. */
export const pollListSchema = z.object({ params: z.object({ id: identifier }) })
/** Require an explicit nonduplicated complete vote selection. */
export const pollVoteSchema = z.object({ params: pollResourceSchema.shape.params, body: z.object({
    optionIds: z.array(identifier).min(1).max(UTILITY_LIMITS.MAX_OPTIONS).refine((ids) => new Set(ids).size === ids.length),
}) })

import { z } from "zod"
import { REGEX } from "../../configs/constants/regex"

/** Validate stable owner-scoped cursor identifiers before inbox pagination. */
export const reminderInboxSchema = z.object({ query: z.object({ cursor: z.string().regex(REGEX.MONGO_ID).optional() }) })

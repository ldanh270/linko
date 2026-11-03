import { PRESENCE_LIMITS } from "@linko/contracts"
import { z } from "zod"
import { REGEX } from "../../configs/constants/regex"
import { PRESENCE_FIELDS } from "./presence.constants"

/** Bound and validate presence identifiers before storage access. */
export const presenceIdsSchema = z.array(z.string().regex(REGEX.MONGO_ID)).max(PRESENCE_LIMITS.MAX_IDS)
    .transform((ids) => [...new Set(ids)])

/** Validate the HTTP representation with the same rules as its socket equivalent. */
export const presenceQuerySchema = z.object({
    query: z.object({
        [PRESENCE_FIELDS.IDS]: z.string().optional().transform((ids) => ids ? ids.split(",") : []).pipe(presenceIdsSchema),
    }),
})

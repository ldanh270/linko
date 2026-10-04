import { PIN_PARAMS } from "@linko/contracts"
import zod from "zod"

import { REGEX } from "../../configs/constants/regex"

/** Validate both identifiers for a pin mutation route. */
export const pinMessageSchema = zod.object({
    params: zod.object({
        [PIN_PARAMS.CONVERSATION_ID]: zod.string().regex(REGEX.MONGO_ID),
        [PIN_PARAMS.MESSAGE_ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
})

/** Validate the conversation identifier for a pin list route. */
export const listPinsSchema = zod.object({
    params: zod.object({
        [PIN_PARAMS.CONVERSATION_ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
})

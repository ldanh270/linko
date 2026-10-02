import {
    CONVERSATION_PARAMS,
    READ_REQUEST_FIELDS,
} from "@linko/contracts"
import zod from "zod"

import { REGEX } from "../../configs/constants/regex"

/** Validate one conversation path and a last-visible-message ObjectId body. */
export const markReadSchema = zod.object({
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
    body: zod.object({
        [READ_REQUEST_FIELDS.LAST_VISIBLE_MESSAGE_ID]: zod.string().regex(REGEX.MONGO_ID),
    }).strict(),
})

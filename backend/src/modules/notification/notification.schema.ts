import {
    CONVERSATION_PARAMS,
    NOTIFICATION_PREFERENCE_REQUEST_FIELDS,
} from "@linko/contracts"
import zod from "zod"

import { REGEX } from "../../configs/constants/regex"

/** Validate the authenticated conversation preference path parameter. */
export const getNotificationPreferenceSchema = zod.object({
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
})

/** Validate a strict boolean preference update for one conversation. */
export const setNotificationPreferenceSchema = zod.object({
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
    body: zod.object({
        [NOTIFICATION_PREFERENCE_REQUEST_FIELDS.IS_MUTED]: zod.boolean(),
    }).strict(),
})

import {
    CONVERSATION_KIND,
    CONVERSATION_PARAMS,
    CONVERSATION_QUERY_PARAMS,
    GROUP_FIELDS,
    GROUP_LIMITS,
} from "@linko/contracts"
import zod from "zod"

import { REGEX } from "../../configs/constants/regex"

const groupNameSchema = zod.string()
    .trim()
    .min(GROUP_LIMITS.MIN_NAME_LENGTH)
    .max(GROUP_LIMITS.MAX_NAME_LENGTH)

const groupDescriptionSchema = zod.string()
    .trim()
    .max(GROUP_LIMITS.MAX_DESCRIPTION_LENGTH)

/** Validate the JSON or multipart body used to create a private group. */
export const createGroupSchema = zod.object({
    body: zod.object({
        [GROUP_FIELDS.NAME]: groupNameSchema,
        [GROUP_FIELDS.DESCRIPTION]: groupDescriptionSchema.optional(),
    }).strict(),
})

/** Validate the only group listing filter accepted by the conversation module. */
export const listConversationsSchema = zod.object({
    query: zod.object({
        [CONVERSATION_QUERY_PARAMS.KIND]: zod.literal(CONVERSATION_KIND.GROUP).optional(),
    }),
})

/** Validate one partial metadata patch and its MongoDB ObjectId route parameter. */
export const updateGroupSchema = zod.object({
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
    }),
    body: zod.object({
        [GROUP_FIELDS.NAME]: groupNameSchema.optional(),
        [GROUP_FIELDS.DESCRIPTION]: groupDescriptionSchema.optional(),
    }).strict(),
})

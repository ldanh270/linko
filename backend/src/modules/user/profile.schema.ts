import { REGEX } from "../../configs/constants/regex"
import { PROFILE_FIELDS, PROFILE_FORM_VALUES, PROFILE_PATTERNS, PROFILE_ROUTE_PARAMS } from "./profile.constants"
import { z } from "zod"

const optionalFormBoolean = z.union([
    z.boolean(),
    z.literal(PROFILE_FORM_VALUES.TRUE).transform(() => true),
    z.literal(PROFILE_FORM_VALUES.FALSE).transform(() => false),
]).optional()

/** Body contract for profile updates after multipart text values are normalized. */
export const updateProfileBodySchema = z.object({
    [PROFILE_FIELDS.USERNAME]: z.string().min(3).max(30).trim().toLowerCase().regex(REGEX.USERNAME).optional(),
    [PROFILE_FIELDS.DISPLAY_NAME]: z.string().trim().min(1).max(50).optional(),
    [PROFILE_FIELDS.EMAIL]: z.email().trim().toLowerCase().optional(),
    [PROFILE_FIELDS.PHONE]: z.string().trim().regex(REGEX.PHONE).or(z.literal("")).nullable().optional(),
    [PROFILE_FIELDS.BIO]: z.string().trim().max(500).nullable().optional(),
    [PROFILE_FIELDS.REMOVE_AVATAR]: optionalFormBoolean,
    [PROFILE_FIELDS.REMOVE_BACKGROUND]: optionalFormBoolean,
})

/** Request validation schema for the authenticated profile update endpoint. */
export const updateProfileSchema = z.object({ body: updateProfileBodySchema })

/** Request validation schema for a public user profile identifier. */
export const publicProfileParamsSchema = z.object({
    params: z.object({
        [PROFILE_ROUTE_PARAMS.USER_ID]: z.string().regex(PROFILE_PATTERNS.OBJECT_ID),
    }),
})

/** Profile body shape after validation and multipart boolean normalization. */
export type ParsedUpdateProfileBody = z.infer<typeof updateProfileBodySchema>

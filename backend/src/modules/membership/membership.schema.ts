import { CONVERSATION_PARAMS, MEMBERSHIP_PARAMS, MEMBERSHIP_REQUEST_FIELDS, ROLE } from "@linko/contracts"
import { z } from "zod"

import { MEMBERSHIP_PATTERNS } from "./membership.constants"

const objectIdSchema = z.string().regex(MEMBERSHIP_PATTERNS.OBJECT_ID)

/** Validate group identifier and member identifier route parameters. */
export const memberParamsSchema = z.object({
    params: z.object({
        id: objectIdSchema,
        userId: objectIdSchema,
    }),
})

/** Validate one group identifier route parameter. */
export const conversationParamsSchema = z.object({
    params: z.object({ [CONVERSATION_PARAMS.ID]: objectIdSchema }),
})

/** Validate a role change request without permitting owner transfer through this route. */
export const changeRoleSchema = z.object({
    params: memberParamsSchema.shape.params,
    body: z.object({ [MEMBERSHIP_REQUEST_FIELDS.ROLE]: z.enum([ROLE.ADMIN, ROLE.MEMBER]) }),
})

/** Validate a current member as the new group owner. */
export const transferOwnerSchema = z.object({
    params: conversationParamsSchema.shape.params,
    body: z.object({ [MEMBERSHIP_REQUEST_FIELDS.NEW_OWNER_ID]: objectIdSchema }),
})

/** Validate a member removal route. */
export const removeMemberSchema = memberParamsSchema

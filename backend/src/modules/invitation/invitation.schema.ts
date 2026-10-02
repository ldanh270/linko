import {
    CONVERSATION_PARAMS,
    INVITATION_LIMITS,
    INVITATION_PATTERNS,
    INVITATION_HEADERS,
    INVITATION_PARAMS,
} from "@linko/contracts"
import zod from "zod"

import { REGEX } from "../../configs/constants/regex"

const emptyBodySchema = zod.object({}).strict().optional()
const emptyQuerySchema = zod.object({}).strict()
const invitationTokenParamsSchema = zod.object({
    [INVITATION_PARAMS.TOKEN]: zod.string()
        .max(INVITATION_LIMITS.TOKEN_LENGTH)
        .regex(INVITATION_PATTERNS.TOKEN),
}).strict()

/** Validate the group identifier and empty body accepted for invitation issuance. */
export const issueInvitationSchema = zod.object({
    headers: zod.object({
        [INVITATION_HEADERS.IDEMPOTENCY_KEY]: zod.string().uuid(),
    }),
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
    }).strict(),
    body: emptyBodySchema,
    query: emptyQuerySchema,
})

/** Validate the group identifier for safe invitation metadata listing. */
export const listInvitationsSchema = zod.object({
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
    }).strict(),
    body: emptyBodySchema,
    query: emptyQuerySchema,
})

/** Validate both ObjectIds before revoking one link from a group. */
export const revokeInvitationSchema = zod.object({
    params: zod.object({
        [CONVERSATION_PARAMS.ID]: zod.string().regex(REGEX.MONGO_ID),
        [INVITATION_PARAMS.INVITATION_ID]: zod.string().regex(REGEX.MONGO_ID),
    }).strict(),
    body: emptyBodySchema,
    query: emptyQuerySchema,
})

/** Validate the URL-safe token before a public invitation lookup. */
export const previewInvitationSchema = zod.object({
    params: invitationTokenParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
})

/** Validate the URL-safe invitation token and empty body accepted at the membership boundary. */
export const acceptInvitationSchema = zod.object({
    params: invitationTokenParamsSchema,
    body: emptyBodySchema,
    query: emptyQuerySchema,
})

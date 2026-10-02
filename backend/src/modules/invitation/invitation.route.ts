import {
    INVITATION_PREVIEW_ROUTE_PATHS,
    INVITATION_ROUTE_PATHS,
} from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { InvitationController } from "./invitation.controller"
import {
    issueInvitationSchema,
    listInvitationsSchema,
    previewInvitationSchema,
    revokeInvitationSchema,
} from "./invitation.schema"
import { createInvitationIssueRateLimit } from "./invitation-issue.rate-limit"

/** Register authenticated invitation issue, list, and revoke endpoints. */
export function createInvitationRouter(controller: InvitationController): Router {
    const router = express.Router()
    router.post(
        INVITATION_ROUTE_PATHS.COLLECTION,
        validate(issueInvitationSchema),
        createInvitationIssueRateLimit(),
        controller.issue,
    )
    router.get(INVITATION_ROUTE_PATHS.COLLECTION, validate(listInvitationsSchema), controller.list)
    router.delete(INVITATION_ROUTE_PATHS.BY_ID, validate(revokeInvitationSchema), controller.revoke)
    return router
}

/** Register the public, read-only invitation preview endpoint before authentication. */
export function createInvitationPreviewRouter(controller: InvitationController): Router {
    const router = express.Router()
    router.use((_request, response, next) => {
        response.setHeader("Referrer-Policy", "no-referrer")
        response.setHeader("Cache-Control", "no-store")
        next()
    })
    router.get(INVITATION_PREVIEW_ROUTE_PATHS.PREVIEW, validate(previewInvitationSchema), controller.preview)
    return router
}

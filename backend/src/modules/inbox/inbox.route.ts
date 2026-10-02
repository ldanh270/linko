import { CONVERSATION_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { InboxController } from "./inbox.controller"
import { listInboxSchema } from "./inbox.schema"

/** Register the authenticated cursor-paginated conversation inbox route. */
export function createInboxRouter(controller: InboxController): Router {
    const router = express.Router()
    router.get(CONVERSATION_ROUTE_PATHS.ROOT, validate(listInboxSchema), controller.list)
    return router
}

import { CONVERSATION_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { ReadStateController } from "./read.controller"
import { markReadSchema } from "./read.schema"

/** Register the authenticated route that advances one participant's read cursor. */
export function createReadStateRouter(controller: ReadStateController): Router {
    const router = express.Router()
    router.put(CONVERSATION_ROUTE_PATHS.READ, validate(markReadSchema), controller.markRead)
    return router
}

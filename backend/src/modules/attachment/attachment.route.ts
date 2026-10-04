import { ATTACHMENT_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import type { AttachmentController } from "./attachment.controller"
import { downloadAttachmentSchema } from "./attachment.schema"

/** Register authenticated protected attachment download routes. */
export function createAttachmentRouter(controller: AttachmentController): Router {
    const router = express.Router()
    router.get(ATTACHMENT_ROUTE_PATHS.DOWNLOAD, validate(downloadAttachmentSchema), controller.download)
    return router
}

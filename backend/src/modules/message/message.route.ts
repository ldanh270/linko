import { MESSAGE_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { parseMessageAttachments } from "../attachment/attachment.upload-middleware"
import { MessageController } from "./message.controller"
import { listMessagesSchema, sendMessageSchema } from "./message.schema"

/** Register authenticated send and cursor-history endpoints for messages. */
export function createMessageRouter(controller: MessageController): Router {
    const router = express.Router()
    router.post(MESSAGE_ROUTE_PATHS.ROOT, parseMessageAttachments, validate(sendMessageSchema), controller.send)
    router.get(MESSAGE_ROUTE_PATHS.BY_CONVERSATION, validate(listMessagesSchema), controller.list)
    return router
}

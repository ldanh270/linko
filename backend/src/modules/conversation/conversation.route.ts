import { CONVERSATION_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { ConversationController } from "./conversation.controller"
import { parseGroupAvatar } from "./group-avatar.middleware"
import { createGroupSchema, listConversationsSchema, updateGroupSchema } from "./conversation.schema"

/** Register the authenticated group HTTP boundary without constructing its controller. */
export function createConversationRouter(controller: ConversationController): Router {
    const router = express.Router()
    router.get(CONVERSATION_ROUTE_PATHS.ROOT, validate(listConversationsSchema), controller.listConversations)
    router.post(
        CONVERSATION_ROUTE_PATHS.ROOT,
        parseGroupAvatar,
        validate(createGroupSchema),
        controller.createGroup,
    )
    router.patch(
        CONVERSATION_ROUTE_PATHS.BY_ID,
        parseGroupAvatar,
        validate(updateGroupSchema),
        controller.updateGroup,
    )
    return router
}

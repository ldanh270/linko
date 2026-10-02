import { CONVERSATION_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { ConversationController } from "./conversation.controller"
import { parseGroupAvatar } from "./group-avatar.middleware"
import { createGroupSchema, updateGroupSchema } from "./conversation.schema"
import { ConversationLifecycleController } from "./conversationLifecycle.controller"
import { closeGroupSchema, leaveGroupSchema } from "./conversationLifecycle.schema"

/** Register the authenticated group HTTP boundary without constructing its controller. */
export function createConversationRouter(controller: ConversationController): Router {
    const router = express.Router()
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

/** Register authenticated leave and close endpoints for group conversations. */
export function createConversationLifecycleRouter(controller: ConversationLifecycleController): Router {
    const router = express.Router()
    router.post(CONVERSATION_ROUTE_PATHS.LEAVE, validate(leaveGroupSchema), controller.leave)
    router.post(CONVERSATION_ROUTE_PATHS.CLOSE, validate(closeGroupSchema), controller.close)
    return router
}

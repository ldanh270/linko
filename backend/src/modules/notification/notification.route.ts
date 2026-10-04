import { NOTIFICATION_PREFERENCE_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { NotificationPreferenceController } from "./notification.controller"
import { getNotificationPreferenceSchema, setNotificationPreferenceSchema } from "./notification.schema"

/** Register authenticated reads and updates for one participant's conversation preference. */
export function createNotificationPreferenceRouter(controller: NotificationPreferenceController): Router {
    const router = express.Router()
    router.get(
        NOTIFICATION_PREFERENCE_ROUTE_PATHS.BY_CONVERSATION,
        validate(getNotificationPreferenceSchema),
        controller.get,
    )
    router.put(
        NOTIFICATION_PREFERENCE_ROUTE_PATHS.BY_CONVERSATION,
        validate(setNotificationPreferenceSchema),
        controller.set,
    )
    return router
}

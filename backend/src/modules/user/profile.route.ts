import { USER_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { ProfileController } from "./profile.controller"
import { publicProfileParamsSchema, updateProfileSchema } from "./profile.schema"
import { parseProfileImages } from "./profile.upload"

/** Register the authenticated profile endpoints without constructing their controller. */
export function createProfileRouter(controller: ProfileController): Router {
    const router = express.Router()
    router.get(USER_ROUTE_PATHS.ME, controller.getMine)
    router.get(USER_ROUTE_PATHS.BY_ID, validate(publicProfileParamsSchema), controller.getPublic)
    router.patch(USER_ROUTE_PATHS.ME, parseProfileImages, validate(updateProfileSchema), controller.updateMine)
    return router
}

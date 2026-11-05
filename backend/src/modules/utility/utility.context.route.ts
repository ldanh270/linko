import { UTILITY_ROUTES } from "@linko/contracts"
import { Router } from "express"
import { z } from "zod"
import validate from "../../middlewares/validate.middleware"
import { REGEX } from "../../configs/constants/regex"
import type { UtilityContextController } from "./utility.context.controller"

/** Validate message deep links before invoking the context controller. */
export function createUtilityContextRouter(controller: UtilityContextController): Router {
  const router = Router()
  const objectId = z.string().regex(REGEX.MONGO_ID)
  router.get(UTILITY_ROUTES.CONTEXT, validate(z.object({ params: z.object({ id: objectId, messageId: objectId }) })), controller.get)
  return router
}

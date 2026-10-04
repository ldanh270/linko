import { PIN_ROUTE_PATHS } from "@linko/contracts"
import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { PinController } from "./pin.controller"
import { listPinsSchema, pinMessageSchema } from "./pin.schema"

/** Register authenticated group pin endpoints after shared identity middleware. */
export function createPinRouter(controller: PinController): Router {
    const router = express.Router()
    router.get(PIN_ROUTE_PATHS.LIST, validate(listPinsSchema), controller.list)
    router.put(PIN_ROUTE_PATHS.MESSAGE, validate(pinMessageSchema), controller.pin)
    router.delete(PIN_ROUTE_PATHS.MESSAGE, validate(pinMessageSchema), controller.unpin)
    return router
}

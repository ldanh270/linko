import { UTILITY_ROUTES } from "@linko/contracts"
import express, { type Router } from "express"
import validate from "../../middlewares/validate.middleware"
import type { UtilityRuntime } from "../utility/utility.types"
import { LocationController } from "./location.controller"
import { MongooseLocationRepository } from "./location.repository"
import { locationCreateSchema, locationFixSchema, locationListSchema, locationResourceSchema } from "./location.schema"
import { LocationService } from "./location.service"

/** Compose foreground location routes and explicit lifecycle cleanup without import-time timers. */
export function createLocationFeature(runtime: UtilityRuntime): { readonly router: Router; readonly cleanup: () => Promise<void> } {
    const service = new LocationService({ runtime, repository: new MongooseLocationRepository() })
    const controller = new LocationController(service)
    const router = express.Router()
    router.get(UTILITY_ROUTES.LOCATIONS, validate(locationListSchema), controller.list)
    router.post(UTILITY_ROUTES.LOCATIONS, validate(locationCreateSchema), controller.create)
    router.get(UTILITY_ROUTES.LOCATION, validate(locationResourceSchema), controller.get)
    router.put(UTILITY_ROUTES.LOCATION_FIX, validate(locationFixSchema), controller.update)
    router.post(UTILITY_ROUTES.STOP_LOCATION, validate(locationResourceSchema), controller.stop)
    return { router, cleanup: () => service.cleanup() }
}

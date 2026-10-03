import express, { type Router } from "express"

import validate from "../../middlewares/validate.middleware"
import { AUTH_ROUTE_PATHS } from "./auth.constants"
import { AuthController } from "./auth.controller"
import { loginSchema, logoutCookieSchema, refreshCookieSchema, signupSchema } from "./auth.schema"

/** Register the auth HTTP boundary without constructing its injected controller. */
export function createAuthRouter(controller: AuthController): Router {
    const router = express.Router()
    router.post(AUTH_ROUTE_PATHS.SIGNUP, validate(signupSchema), controller.signup)
    router.post(AUTH_ROUTE_PATHS.LOGIN, validate(loginSchema), controller.login)
    router.post(AUTH_ROUTE_PATHS.REFRESH, validate(refreshCookieSchema), controller.refresh)
    router.post(AUTH_ROUTE_PATHS.LOGOUT, validate(logoutCookieSchema), controller.logout)
    return router
}

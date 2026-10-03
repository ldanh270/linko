import { ERROR_CODES } from "@linko/contracts"
import cookieParser from "cookie-parser"
import express, { type Express, type RequestHandler, type Router } from "express"

import { BusinessException } from "./shared/errors/BusinessException"
import type { ServerLogger } from "./shared/logger/logger"
import { createGlobalErrorHandler } from "./shared/middlewares/globalErrorHandler"
import { withRequestContext } from "./shared/middlewares/requestContext"

/** Collaborators and route groups wired by the composition root. */
export interface AppDependencies {
    publicRoutes: Router
    privateRoutes: Router
    authenticate: RequestHandler
    logger: ServerLogger
}

/** Compose the Express middleware boundary and existing route groups once. */
export function createApp(dependencies: AppDependencies): Express {
    const app = express()
    app.use(withRequestContext)
    app.use(express.json())
    app.use(cookieParser())
    app.use(dependencies.publicRoutes)
    app.use(dependencies.authenticate)
    app.use(dependencies.privateRoutes)
    app.use(() => {
        throw new BusinessException(ERROR_CODES.NOT_FOUND, 404, "Route not found")
    })
    app.use(createGlobalErrorHandler(dependencies.logger))
    return app
}

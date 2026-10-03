import { randomUUID } from "node:crypto"
import { AsyncLocalStorage } from "node:async_hooks"

import type { RequestHandler } from "express"

/** Request data read by audit and error handling aspects. */
export interface RequestContext {
    requestId: string
    userId?: string
    ip?: string
}

/** Store per-request context across asynchronous operations. */
export const requestContext = new AsyncLocalStorage<RequestContext>()

/** Assign a generated request ID before any route or parser can fail. */
export const withRequestContext: RequestHandler = (request, _response, next) => {
    requestContext.run({ requestId: randomUUID(), ip: request.ip }, next)
}

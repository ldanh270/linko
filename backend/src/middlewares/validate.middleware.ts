import type { RequestHandler } from "express"
import type { ZodType } from "zod"

/** Validate request input, apply normalized body output, and defer Zod failures to the global handler. */
const validate = (schema: ZodType): RequestHandler => (request, _response, next) => {
    const parsed = schema.parse({
        body: request.body,
        query: request.query,
        params: request.params,
        cookies: request.cookies,
    })
    if (hasValidatedBody(parsed)) request.body = parsed.body
    next()
}

/** Narrow parsed request schemas that include a body before applying transformations. */
function hasValidatedBody(value: unknown): value is { body: unknown } {
    return typeof value === "object" && value !== null && "body" in value
}

export default validate

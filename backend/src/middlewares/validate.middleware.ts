import type { RequestHandler } from "express"
import type { ZodType } from "zod"

/** Validate request input and let the global error handler translate Zod failures. */
const validate = (schema: ZodType): RequestHandler => (request, _response, next) => {
    schema.parse({ body: request.body, query: request.query, params: request.params })
    next()
}

export default validate

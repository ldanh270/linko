import { HttpStatusCode } from "#/configs/constants/httpStatusCode"

import { NextFunction, Request, Response } from "express"
import { ZodError, ZodObject } from "zod"

const validate = (schema: ZodObject) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        })

        next()
    } catch (error) {
        if (error instanceof ZodError) {
            const formattedErrors = error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }))

            return res.status(HttpStatusCode.BAD_REQUEST).json({
                errors: formattedErrors,
            })
        }

        return res.status(HttpStatusCode.INTERNAL_SERVER).json({
            message: "Internal server error",
        })
    }
}

export default validate

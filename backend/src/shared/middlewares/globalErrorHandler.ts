import { ERROR_CODES, type ApiErrorBody } from "@linko/contracts"
import type { ErrorRequestHandler } from "express"
import jwt from "jsonwebtoken"
import { ZodError } from "zod"

import { BusinessException } from "../errors/BusinessException"
import { ApiResponse } from "../http/ApiResponse"
import type { ServerLogger } from "../logger/logger"
import { requestContext } from "./requestContext"

const CLIENT_MESSAGES = {
    VALIDATION: "Invalid request",
    MALFORMED_JSON: "Malformed JSON",
    INVALID_TOKEN: "Invalid or expired token",
    INTERNAL: "Internal server error",
} as const

const mapClientError = (error: unknown): BusinessException | null => {
    if (error instanceof ZodError) {
        return new BusinessException(ERROR_CODES.VALIDATION, 400, CLIENT_MESSAGES.VALIDATION)
    }
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
        return new BusinessException(ERROR_CODES.INVALID_TOKEN, 401, CLIENT_MESSAGES.INVALID_TOKEN)
    }
    if (error instanceof SyntaxError && "body" in error) {
        return new BusinessException(ERROR_CODES.MALFORMED_JSON, 400, CLIENT_MESSAGES.MALFORMED_JSON)
    }
    return null
}

/**
 * Express error-handling middleware factory.
 * Translates known business exceptions and client validation errors into uniform API failure envelopes
 * while safely logging unexpected technical failures with request context and generating correlation IDs.
 *
 * @param logger - The server logger instance.
 * @returns An Express ErrorRequestHandler function.
 */
export function createGlobalErrorHandler(logger: ServerLogger): ErrorRequestHandler {
    return (error: unknown, request, response, _next) => {
        const businessError = error instanceof BusinessException ? error : mapClientError(error)
        if (businessError) {
            const body: ApiErrorBody = {
                code: businessError.code,
                message: businessError.message,
                ...(businessError.details ? { details: businessError.details } : {}),
            }
            response.status(businessError.httpStatus).json(ApiResponse.fail(body))
            return
        }

        const context = requestContext.getStore()
        const requestId = context?.requestId ?? "unavailable"
        logger.error(error instanceof Error ? error : new Error(String(error)), {
            requestId,
            method: request.method,
            path: request.path,
            userId: context?.userId,
        })
        response.status(500).json(
            ApiResponse.fail({
                code: ERROR_CODES.INTERNAL,
                message: CLIENT_MESSAGES.INTERNAL,
                requestId,
            }),
        )
    }
}

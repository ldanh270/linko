import { ERROR_CODES } from "@linko/contracts"
import { AUTH_FIELDS, AUTH_SECURITY } from "#/modules/auth/auth.constants"
import User from "#/models/User"
import { BusinessException } from "#/shared/errors/BusinessException"
import { requestContext } from "#/shared/middlewares/requestContext"

import type { RequestHandler } from "express"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const AUTH_MESSAGES = {
    MISSING_TOKEN: "Missing access token",
    INVALID_TOKEN: "Invalid or expired token",
} as const

/** Create auth middleware bound to the validated access-token secret. */
export function createAuthenticate(accessTokenSecret: string): RequestHandler {
    return async (request, _response, next) => {
        const header = request.get("Authorization")
        const token = header?.startsWith("Bearer ") ? header.slice(7) : null
        if (!token) {
            throw new BusinessException(ERROR_CODES.UNAUTHORIZED, 401, AUTH_MESSAGES.MISSING_TOKEN)
        }

        const payload = jwt.verify(token, accessTokenSecret, {
            issuer: AUTH_SECURITY.ACCESS_TOKEN_ISSUER,
            audience: AUTH_SECURITY.ACCESS_TOKEN_AUDIENCE,
        })
        const userId = typeof payload === "object" && typeof payload[AUTH_FIELDS.USER_ID] === "string"
            ? payload[AUTH_FIELDS.USER_ID]
            : null
        if (!userId || !mongoose.isValidObjectId(userId)) {
            throw new BusinessException(ERROR_CODES.INVALID_TOKEN, 401, AUTH_MESSAGES.INVALID_TOKEN)
        }

        const user = await User.findById(userId).select("-hashedPassword")
        if (!user) {
            throw new BusinessException(ERROR_CODES.INVALID_TOKEN, 401, AUTH_MESSAGES.INVALID_TOKEN)
        }
        request.user = user
        const context = requestContext.getStore()
        if (context) context.userId = user._id.toString()
        next()
    }
}

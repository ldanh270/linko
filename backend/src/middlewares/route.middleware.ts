import { ERROR_CODES } from "@linko/contracts"
import { ACCESS_TOKEN_SECRET } from "#/configs/constants/authTokens"
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

/** Authenticate a bearer token before any protected route can access user context. */
const protectRoutes: RequestHandler = async (request, _response, next) => {
    const header = request.get("Authorization")
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) {
        throw new BusinessException(ERROR_CODES.UNAUTHORIZED, 401, AUTH_MESSAGES.MISSING_TOKEN)
    }

    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET)
    const userId = typeof payload === "object" && typeof payload.userId === "string"
        ? payload.userId
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

export default protectRoutes

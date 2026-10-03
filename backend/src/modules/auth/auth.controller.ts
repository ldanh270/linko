import { ERROR_CODES, type ApiEnvelope, type AuthAccessTokenDto, type LoginInput, type SignupInput, type UserDto } from "@linko/contracts"
import type { Request, RequestHandler, Response } from "express"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { AUTH_COOKIE_NAME, AUTH_MESSAGES, AUTH_SECURITY } from "./auth.constants"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { UnauthorizedException } from "../../shared/errors/UnauthorizedException"
import type { AuthCookieConfiguration } from "./auth.types"
import { AuthService } from "./auth.service"

type EmptyRequestBody = Record<string, never>
type AuthRequestHandler<Body, Data> = RequestHandler<Record<string, string>, ApiEnvelope<Data>, Body>

/** Translate auth HTTP requests into service calls and standard API responses.
 *
 * Refresh credentials are written and cleared with one cookie configuration so browsers
 * can consistently send the same HttpOnly cookie back to the API.
 *
 * @layer Controller
 */
export class AuthController {
    /** Bind the auth use cases and validated refresh-cookie policy. */
    constructor(
        private readonly service: AuthService,
        private readonly cookieConfiguration: AuthCookieConfiguration,
    ) {}

    /** Create an account and return only its public user DTO. */
    readonly signup: AuthRequestHandler<SignupInput, UserDto> = async (request, response) => {
        const user = await this.service.signup(request.body)
        response.status(HttpStatusCode.CREATED).json(ApiResponse.ok(user))
    }

    /** Authenticate credentials, set the refresh cookie, and return the access token. */
    readonly login: AuthRequestHandler<LoginInput, AuthAccessTokenDto> = async (request, response) => {
        const tokens = await this.service.login(request.body)
        this.setRefreshCookie(response, tokens.refreshToken)
        response.status(HttpStatusCode.OK).json(ApiResponse.ok({ accessToken: tokens.accessToken }))
    }

    /** Rotate the refresh cookie and return its matching access token. */
    readonly refresh: AuthRequestHandler<EmptyRequestBody, AuthAccessTokenDto> = async (request, response) => {
        const refreshToken = this.getRefreshToken(request)
        if (!refreshToken) {
            throw new UnauthorizedException(ERROR_CODES.INVALID_SESSION, AUTH_MESSAGES.INVALID_SESSION)
        }

        const tokens = await this.service.refresh(refreshToken)
        this.setRefreshCookie(response, tokens.refreshToken)
        response.status(HttpStatusCode.OK).json(ApiResponse.ok({ accessToken: tokens.accessToken }))
    }

    /** Revoke the current refresh session when present and clear its cookie idempotently. */
    readonly logout: AuthRequestHandler<EmptyRequestBody, null> = async (request, response) => {
        const refreshToken = this.getRefreshToken(request)
        if (refreshToken) await this.service.logout(refreshToken)
        response.clearCookie(AUTH_COOKIE_NAME, { ...this.cookieConfiguration, httpOnly: true })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(null))
    }

    private getRefreshToken(request: Request): string | undefined {
        const cookies: unknown = request.cookies
        if (!isObjectRecord(cookies) || !(AUTH_COOKIE_NAME in cookies)) return undefined
        const refreshToken: unknown = cookies[AUTH_COOKIE_NAME]
        return typeof refreshToken === "string" && refreshToken.length > 0 ? refreshToken : undefined
    }

    private setRefreshCookie(response: Response, refreshToken: string): void {
        response.cookie(AUTH_COOKIE_NAME, refreshToken, {
            ...this.cookieConfiguration,
            httpOnly: true,
            maxAge: AUTH_SECURITY.REFRESH_TOKEN_TTL_MS,
        })
    }
}

/** Narrow parsed cookie containers before reading an untrusted request value. */
function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

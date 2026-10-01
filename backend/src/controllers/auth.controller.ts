import { REFRESH_TOKEN_TTL } from "#/configs/constants/authTokens"
import { HttpStatusCode } from "#/configs/constants/httpStatusCode"
import { AuthService } from "#/services/auth.service"

import { Request, Response } from "express"

export class AuthController {
    constructor(private readonly service: AuthService) {}

    /**
     * Sign up controller
     * @param req Input data to sign up (username, password, email, displayName) (res.body)
     * @param res Created user data (res.body)
     */
    signup = async (req: Request, res: Response) => {
        try {
            const { username, password, email, displayName } = req.body

            // Create new user in database
            const user = await this.service.signup({ username, password, email, displayName })

            return res.status(HttpStatusCode.CREATED)
        } catch (error) {
            console.error("AuthController - signup error:" + error)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    /**
     * Login controller
     * @param req Input username & password (res.body)
     * @param res Access token (res.body) & Refresh token (res.cookies)
     */
    login = async (req: Request, res: Response) => {
        try {
            const { username, password } = req.body

            // Verify logged in user
            const tokens = await this.service.login({ username, password })

            // Response refresh token (in cookie)
            res.cookie("refreshToken", tokens.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "none", // For stateless front-end & back-end
                maxAge: REFRESH_TOKEN_TTL,
            })

            // Response access token (in res.body)
            return res.status(HttpStatusCode.OK).json({
                message: `Login successfully`,
                accessToken: tokens.accessToken,
            })
        } catch (error) {
            console.error("AuthController - login error:" + error)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    /**
     * Logout controller
     * @param req Existing refresh token (res.cookies)
     * @param res No content
     */
    logout = async (req: Request, res: Response) => {
        try {
            const refreshToken = req.cookies?.refreshToken

            // Delete refresh token
            if (refreshToken) {
                this.service.logout(refreshToken)
            }

            // Delete cookie
            res.clearCookie("refreshtoken")

            return res.status(HttpStatusCode.NO_CONTENT)
        } catch (error) {
            console.error("AuthController - logout error:" + error)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    /**
     * Get new Access token from Refresh token
     * @param req Refresh token (res.cookies)
     * @param res New access token (res.body)
     */
    getNewToken = async (req: Request, res: Response) => {
        try {
            const refreshToken = req.cookies?.refreshToken

            // Validate
            if (!refreshToken) {
                return res.status(HttpStatusCode.UNAUTHORIZED).json({ message: "Token not exists" })
            }

            // Get new Access token
            const accessToken = await this.service.getNewToken(refreshToken)

            return res.status(HttpStatusCode.OK).json({ accessToken })
        } catch (error) {
            console.error("AuthController - getNewToken error:" + error)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }
}

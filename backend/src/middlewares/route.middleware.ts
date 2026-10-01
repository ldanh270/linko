import { ACCESS_TOKEN_SECRET } from "#/configs/constants/authTokens"
import User from "#/models/User"

import { NextFunction, Request, Response } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"

interface DecodedToken extends JwtPayload {
    userId: string
}

const protectRoutes = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get access token in res.header
        const authHeader = req.headers["authorization"]
        const accessToken = authHeader && authHeader.split(" ")[1] // authHeader: Bearer <accessToken>

        if (!accessToken) {
            return res.status(401).json({ message: "Missing access token" })
        }
        // Verify access token
        jwt.verify(accessToken, ACCESS_TOKEN_SECRET, async (error, decodedUser) => {
            if (error || !decodedUser) {
                console.error(error)
                return res.status(403).json({ message: "Incorrect or expired token" })
            }
            // Find user id in database
            // Select all except hashedPassword to display
            const user = await User.findById((decodedUser as DecodedToken).userId).select(
                "-hashedPassword",
            )

            if (!user) {
                return res.status(404).json({ message: "User not exists" })
            }
            // Return user id in req
            req.user = user
            next()
        })
    } catch (error) {
        console.error("Verify JWT in middleware protectRoutes ERROR: " + (error as Error).message)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export default protectRoutes

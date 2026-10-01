import { HttpStatusCode } from "#/configs/constants/httpStatusCode"
import User from "#/models/User"
import { UserService } from "#/services/user.service"
import { checkUniqueFields } from "#/utils/user.util"

import { Request, Response } from "express"

export class UserController {
    constructor(private readonly service: UserService) {}

    // GET /me
    getUserProfile = async (req: Request, res: Response) => {
        try {
            const user = req.user

            if (!user)
                return res.status(HttpStatusCode.UNAUTHORIZED).json({ message: "Unauthorized" })

            return res.status(HttpStatusCode.OK).json({ user })
        } catch (error) {
            console.error("UserController - getUserProfile error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // GET /search
    searchUsers = async (req: Request, res: Response) => {
        try {
            const { type } = req.body
            const { keyword } = req.query

            if (!keyword) return res.status(HttpStatusCode.NO_CONTENT).json([])

            if (type !== "TYPING" && type !== "FULL")
                return res
                    .status(HttpStatusCode.BAD_REQUEST)
                    .json({ message: "Invalid keyword type" })

            const users = await this.service.searchUserByKeywords({
                keyword: keyword as string,
                type,
            })

            return res.status(HttpStatusCode.OK).json({ users })
        } catch (error) {
            console.error("UserController - searchUsers error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // GET /:userId
    getUserByParams = async (req: Request, res: Response) => {
        try {
            const { userId } = req.params
            const loginUserId = req.user?._id

            // User not logged-in or missing user data
            if (!loginUserId)
                return res.status(HttpStatusCode.UNAUTHORIZED).json({ message: "Unauthorized" })

            // Get params user info
            const user = await this.service.getUserInfo({ userId })

            // User not found
            if (!user)
                return res.status(HttpStatusCode.NOT_FOUND).json({ message: "User not found" })

            // Return user to client
            return res.status(HttpStatusCode.OK).json({ user })
        } catch (error) {
            console.error("UserController - getUserByParams error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // PATCH /
    updateProfile = async (req: Request, res: Response) => {
        try {
            const user = req.user
            const { username, displayName, email, phone, bio } = req.body

            /**
             * Get file from upload middleware
             * @fieldname key string (e.g. avatar, background, ...)
             */
            const files = req.files as { [fieldname: string]: Express.Multer.File[] }

            /**
             * VALIDATE
             */
            // TODO: Create check field helper for duplicate unique fields

            // Check authorization
            if (!user._id)
                return res.status(HttpStatusCode.UNAUTHORIZED).json({ message: "Unauthorized" })

            // Check username
            if (username && username !== user.username) {
                const user = await checkUniqueFields({ key: "username", value: username })

                if (user)
                    return res
                        .status(HttpStatusCode.CONFLICT)
                        .json({ message: "Existing username" })
            }

            // Check email
            if (email && email !== user.email) {
                const user = await checkUniqueFields({ key: "email", value: email })

                if (user)
                    return res.status(HttpStatusCode.CONFLICT).json({ message: "Existing email" })
            }

            // Check phone
            if (phone && phone != user.phone) {
                const user = await checkUniqueFields({ key: "phone", value: phone })

                if (user)
                    return res
                        .status(HttpStatusCode.CONFLICT)
                        .json({ message: "Existing phone number" })
            }

            /**
             * LOGIC
             */

            // Update user info
            const updatedUser = await this.service.updateUserInfo({
                userId: user._id.toString(),
                updateData: req.body, // Contains text fields & string/null
                files: files,
            })

            // Update successfully
            res.status(200).json({
                user: updatedUser,
            })
        } catch (error) {
            console.error("UserController - updateProfile ERROR: " + (error as Error).message)
            return res
                .status(HttpStatusCode.INTERNAL_SERVER)
                .json({ message: "Internal server error" })
        }
    }
}

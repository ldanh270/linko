import { UserController } from "#/controllers/user.controller"
import { uploadCloud } from "#/middlewares/upload.middleware"
import validate from "#/middlewares/validate.middleware"
import { updateUserSchema } from "#/schemas/user.schema"
import { UserService } from "#/services/user.service"

import express from "express"

const userRoutes = express.Router()

const service = new UserService()
const controller = new UserController(service)

// Get profile info of current user
userRoutes.get("/me", controller.getUserProfile)

// Search for users by query
userRoutes.get("/search", controller.searchUsers)

// View other user's profile
userRoutes.get("/:userId", controller.getUserByParams)

// Update current user profile details
userRoutes.patch(
    "/me",
    uploadCloud.fields([
        { name: "avatar", maxCount: 1 },
        { name: "background", maxCount: 1 },
    ]),
    validate(updateUserSchema),
    controller.updateProfile,
)

// Delete current user account
userRoutes.delete("/", () => {})

export default userRoutes

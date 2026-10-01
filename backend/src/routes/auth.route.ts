import { AuthController } from "#/controllers/auth.controller"
import validate from "#/middlewares/validate.middleware"
import { loginSchema, signupSchema } from "#/schemas/auth.schema"
import { AuthService } from "#/services/auth.service"

import express from "express"

const authRoutes = express.Router()

const service = new AuthService()
const controller = new AuthController(service)

// Signup
authRoutes.post("/signup", validate(signupSchema), controller.signup)

// Login
authRoutes.post("/login", validate(loginSchema), controller.login)

// Logout
authRoutes.post("/logout", controller.logout)

// Use Refresh token to get Access token
authRoutes.post("/refresh-token", controller.getNewToken)

export default authRoutes

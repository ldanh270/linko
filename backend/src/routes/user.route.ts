import { USER_ROUTE_PATHS } from "@linko/contracts"
import express from "express"

import { UserController } from "../controllers/user.controller"
import { UserService } from "../services/user.service"

const userRoutes = express.Router()
const controller = new UserController(new UserService())

userRoutes.get(USER_ROUTE_PATHS.SEARCH, controller.searchUsers)

export default userRoutes

import "dotenv/config"
import { API_ROUTES } from "@linko/contracts"
import { createServer } from "node:http"

import authRoutes from "#/routes/auth.route"
import conversationRoutes from "#/routes/conversation.route"
import friendRoutes from "#/routes/friend.route"
import messageRoutes from "#/routes/message.route"
import userRoutes from "#/routes/user.route"

import express from "express"

import { createApp } from "./app"
import { connectDB } from "./libs/database"
import protectRoutes from "./middlewares/route.middleware"
import { ApiResponse } from "./shared/http/ApiResponse"
import { logger } from "./shared/logger/logger"
import { attachSocket } from "./socket/socket"

const publicRoutes = express.Router()
publicRoutes.get("/", (_request, response) => response.json(ApiResponse.ok({ status: "ok" })))
publicRoutes.use(API_ROUTES.AUTH, authRoutes)

const privateRoutes = express.Router()
privateRoutes.use(API_ROUTES.CONVERSATIONS, conversationRoutes)
privateRoutes.use(API_ROUTES.MESSAGES, messageRoutes)
privateRoutes.use(API_ROUTES.USERS, userRoutes)
privateRoutes.use(API_ROUTES.FRIENDS, friendRoutes)

const app = createApp({ publicRoutes, privateRoutes, authenticate: protectRoutes, logger })
const server = createServer(app)
attachSocket(server)

const port = Number(process.env.PORT ?? 5000)
await connectDB()
server.listen(port, () => {
    process.stdout.write(`${JSON.stringify({ level: "info", message: "Server started", port })}\n`)
})

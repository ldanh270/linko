import "dotenv/config"
import { API_ROUTES } from "@linko/contracts"
import { createServer } from "node:http"

import { loadAuthConfig } from "#/configs/auth.config"
import friendRoutes from "#/routes/friend.route"
import userRoutes from "#/routes/user.route"

import express from "express"

import { createApp } from "./app"
import { connectDB } from "./libs/database"
import { ApiResponse } from "./shared/http/ApiResponse"
import { logger } from "./shared/logger/logger"
import { attachSocket } from "./socket/socket"

const publicRoutes = express.Router()
publicRoutes.get("/", (_request, response) => response.json(ApiResponse.ok({ status: "ok" })))

const privateRoutes = express.Router()
privateRoutes.use(API_ROUTES.USERS, userRoutes)
privateRoutes.use(API_ROUTES.FRIENDS, friendRoutes)

const authConfig = loadAuthConfig()
const app = createApp({ publicRoutes, privateRoutes, logger, authConfig })
const server = createServer(app)
attachSocket(server, authConfig.clientOrigin)

const port = Number(process.env.PORT ?? 5000)
await connectDB()
server.listen(port, () => {
    process.stdout.write(`${JSON.stringify({ level: "info", message: "Server started", port })}\n`)
})

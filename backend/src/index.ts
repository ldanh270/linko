import "dotenv/config"
import { createServer } from "node:http"

import { loadAuthConfig } from "#/configs/auth.config"

import express from "express"

import { createApp } from "./app"
import { connectDB } from "./libs/database"
import { ApiResponse } from "./shared/http/ApiResponse"
import { logger } from "./shared/logger/logger"
import { attachSocket } from "./socket/socket"
import { RealtimeGateway } from "./modules/realtime/realtime.gateway"
import { MongooseRealtimeRepository } from "./modules/realtime/realtime.repository"
import { AuthTokenService } from "./modules/auth/auth.security"

const publicRoutes = express.Router()
publicRoutes.get("/", (_request, response) => response.json(ApiResponse.ok({ status: "ok" })))

const privateRoutes = express.Router()

const authConfig = loadAuthConfig()
const realtimeGateway = new RealtimeGateway({
    tokenVerifier: new AuthTokenService(authConfig.accessTokenSecret),
    repository: new MongooseRealtimeRepository(),
})
const app = createApp({ publicRoutes, privateRoutes, logger, authConfig, realtimeGateway })
const server = createServer(app)
attachSocket(server, authConfig.clientOrigin, realtimeGateway)

const port = Number(process.env.PORT ?? 5000)
await connectDB()
server.listen(port, () => {
    process.stdout.write(`${JSON.stringify({ level: "info", message: "Server started", port })}\n`)
})

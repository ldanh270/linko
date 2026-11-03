import "dotenv/config"
import mongoose from "mongoose"
import { createRedisClient } from "./configs/redis.config"
import { PresenceService } from "./modules/realtime/presence.service"
import { MemoryPresenceStore } from "./modules/realtime/presence.memory"
import { BitmapPresenceStore } from "./modules/realtime/presence.bitmap"
import { RedisPresenceSessions } from "./modules/realtime/presence.sessions"
import { MongoosePresenceRepository } from "./modules/realtime/presence.repository"
import { PRESENCE_MESSAGES } from "./modules/realtime/presence.constants"
import { TypingService } from "./modules/realtime/realtime.typing"
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
const recordRealtimeFailure = (error: unknown): void => {
    logger.error(error instanceof Error ? error : new Error(String(error)), { requestId: "realtime", method: "SOCKET", path: "/socket.io" })
}
const redis = createRedisClient(recordRealtimeFailure)
if (!redis && process.env.NODE_ENV === "production") recordRealtimeFailure(new Error(PRESENCE_MESSAGES.REDIS_MISSING))
const presence = new PresenceService({
    primary: redis ? new RedisPresenceSessions(redis, new BitmapPresenceStore(redis)) : null,
    fallback: new MemoryPresenceStore(), repository: new MongoosePresenceRepository(),
    onError: recordRealtimeFailure, onOffline: (userId) => realtimeGateway.publishPresence(userId, false),
})
const realtimeRepository = new MongooseRealtimeRepository()
const realtimeGateway = new RealtimeGateway({
    typing: new TypingService(realtimeRepository),
    presence,
    onError: recordRealtimeFailure,
    tokenVerifier: new AuthTokenService(authConfig.accessTokenSecret),
    repository: realtimeRepository,
})
const app = createApp({ publicRoutes, privateRoutes, logger, authConfig, realtimeGateway, presence })
const server = createServer(app)
const io = attachSocket(server, authConfig.clientOrigin, realtimeGateway)

const port = Number(process.env.PORT ?? 5000)
await connectDB()
await presence.start()
server.listen(port, () => {
    process.stdout.write(`${JSON.stringify({ level: "info", message: "Server started", port })}\n`)
})

/** Close socket transport first so final disconnects complete before persistence shutdown. */
const shutdown = (): void => {
    io.close(() => { void presence.stop().then(() => mongoose.disconnect()).catch(recordRealtimeFailure) })
}
process.once("SIGTERM", shutdown)
process.once("SIGINT", shutdown)

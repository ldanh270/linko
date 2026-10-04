import type { Server as HttpServer } from "node:http"

import { Server } from "socket.io"

import type { RealtimeGateway } from "../modules/realtime/realtime.gateway"

/** Attach realtime transport to the same HTTP server as the API. */
export function attachSocket(server: HttpServer, clientOrigin: string, gateway: RealtimeGateway): Server {
    const io = new Server(server, {
        cors: { origin: clientOrigin, credentials: true },
    })
    gateway.register(io)
    return io
}

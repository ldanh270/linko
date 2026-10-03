import type { Server as HttpServer } from "node:http"

import { Server } from "socket.io"

/** Attach realtime transport to the same HTTP server as the API. */
export function attachSocket(server: HttpServer): Server {
    const io = new Server(server, {
        cors: { origin: process.env.CLIENT_URL, credentials: true },
    })
    return io
}

import type { Server as HttpServer } from "node:http"

import { Server } from "socket.io"

/** Attach realtime transport to the same HTTP server as the API. */
export function attachSocket(server: HttpServer, clientOrigin: string): Server {
    const io = new Server(server, {
        cors: { origin: clientOrigin, credentials: true },
    })
    return io
}

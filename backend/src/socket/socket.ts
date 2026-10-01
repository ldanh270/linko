import express from "express"
import http from "http"
import { Server } from "socket.io"

const app = express()

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
    },
})

io.on("connection", async (socket) => {
    console.log(`Socket conneted: ${socket.id}`)

    socket.on("disconnect", () => {
        console.log(`socket disconnected: ${socket.id}`)
    })
})

export { io, app, server }

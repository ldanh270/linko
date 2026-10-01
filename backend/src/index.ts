import { connectDB } from "#/libs/database"
import protectRoutes from "#/middlewares/route.middleware"
import authRouters from "#/routes/auth.route"
import conversationRouters from "#/routes/conversation.route"
import friendRouters from "#/routes/friend.route"
import messageRoutes from "#/routes/message.route"
import userRouters from "#/routes/user.route"
import { app, server } from "#/socket/socket"

import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import express, { NextFunction, Request, Response } from "express"

/**
 * Server configurations
 */
dotenv.config() // Create config for using .env variables
const PORT = process.env.PORT || 5000 // Port where server runing on

/**
 * Middleware
 */

app.use(express.json())
app.use(cookieParser())

/**
 * Main routers
 */

// Public routes
app.get("/", async (req, res) =>
    res.status(200).json({ message: "Connect to server successfully" }),
)

app.use("/api/auth", authRouters)

// Private routes
app.use(protectRoutes)

app.use("/api/conversations", conversationRouters)
app.use("/api/messages", messageRoutes)
app.use("/api/users", userRouters)
app.use("/api/friends", friendRouters)

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        status: "error",
        message: "Route not found",
    })
})

// Global error
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("GLOBAL ERROR:", err) // <--- Log này sẽ hiện ra "MulterError: Unexpected field"
    res.status(500).send("Internal Server Error")
})

/**
 * Must connect to database successfully before start server
 */
connectDB().then(() =>
    server.listen(PORT, () => {
        console.log("Server start on port " + PORT)
    }),
)

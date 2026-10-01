import { HttpStatusCode } from "#/configs/constants/httpStatusCode"
import { FriendService } from "#/services/friend.service"

import { Request, Response } from "express"

export class FriendController {
    constructor(private readonly service: FriendService) {}

    // Get data
    getAllFriends = async (req: Request, res: Response) => {
        try {
            const userId = req.user._id

            // Validate
            if (!userId) return res.status(400).json({ message: "Missing user data" })

            // Get friend list of current user
            const list = await this.service.getAllFriends(userId.toString())

            return res.status(200).json({ list })
        } catch (error) {
            console.error("FriendController - getAllFriends error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    getSentRequests = async (req: Request, res: Response) => {
        try {
            const userId = req.user._id

            // Validate
            if (!userId) return res.status(400).json({ message: "Missing user data" })

            // Get requests current user sent
            const list = await this.service.getAllFriendRequests(userId.toString(), "SENT")

            return res.status(200).json({ list })
        } catch (error) {
            console.error("FriendController - getSentRequests error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    getRecievedRequests = async (req: Request, res: Response) => {
        try {
            const userId = req.user._id

            // Validate
            if (!userId) return res.status(400).json({ message: "Missing user data" })

            // Get requests current user sent
            const list = await this.service.getAllFriendRequests(userId.toString(), "RECEIVED")

            return res.status(200).json({ list })
        } catch (error) {
            console.error(
                "FriendController - getRecievedRequests error:" + (error as Error).message,
            )
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // Send request
    sendFriendRequest = async (req: Request, res: Response) => {
        try {
            const from = req.user._id
            const { to, message } = req.body

            // Validate
            if (!from) return res.status(401).json({ message: "Unauthorized" })
            if (!to) return res.status(400).json({ message: "Missing sendTo" })

            if (from === to)
                return res.status(400).json({ message: "Sender and receiver cannot be the same" })

            // Create friend request in database
            const request = await this.service.sendFriendRequest(from.toString(), to, message)

            return res.status(201).json({ request })
        } catch (error) {
            console.error("FriendController - sendFriendRequest error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    unfriend = async (req: Request, res: Response) => {
        try {
            const userId = req.user._id
            const { friendId } = req.params

            // Validate
            if (!userId) return res.status(400).json({ message: "Missing user data" })
            if (!friendId) return res.status(400).json({ message: "Missing friend id" })

            await this.service.unfriend(userId.toString(), friendId)

            return res.status(204)
        } catch (error) {
            console.error("FriendController - unfriend error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // Modify request
    acceptRequest = async (req: Request, res: Response) => {
        try {
            const userId = req.user._id
            const { requestId } = req.params

            // Validate
            if (!userId) return res.status(400).json({ message: "Missing user data" })
            if (!requestId) return res.status(400).json({ message: "Missing friend request id" })

            // Create friendship & Delete friend request
            const friendship = await this.service.acceptRequest(requestId, userId.toString())

            return res.status(201).json({ friendship })
        } catch (error) {
            console.error("FriendController - acceptRequest error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    declineRequest = async (req: Request, res: Response) => {
        try {
            const userId = req.user._id
            const { requestId } = req.params

            // Validate
            if (!userId) return res.status(400).json({ message: "Missing user data" })
            if (!requestId) return res.status(400).json({ message: "Missing friend request id" })

            // Delete friend request
            await this.service.declineRequest(requestId, userId.toString())

            return res.status(204)
        } catch (error) {
            console.error("FriendController - declineRequest error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }
}

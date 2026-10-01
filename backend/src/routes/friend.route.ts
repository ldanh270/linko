import { FriendController } from "#/controllers/friend.controller"
import { FriendService } from "#/services/friend.service"

import express from "express"

const friendRoutes = express.Router()

const service = new FriendService()
const controller = new FriendController(service)

// List friends of current user
friendRoutes.get("/", controller.getAllFriends)

// List request that current user sent
friendRoutes.get("/sent", controller.getSentRequests)

// List request that current user received
friendRoutes.get("/received", controller.getRecievedRequests)

// Send friend request for specific user
friendRoutes.post("/sent", controller.sendFriendRequest)

// Unfriend
friendRoutes.delete("/:friendId", controller.unfriend)

// Accept request
friendRoutes.post("/:requestId/accept", controller.acceptRequest)

// Decline request
friendRoutes.post("/:requestId/accept", controller.declineRequest)

export default friendRoutes

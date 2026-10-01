import { MessageController } from "#/controllers/message.controller"
import { checkFriendship } from "#/middlewares/friend.middleware"
import { ConversationService } from "#/services/conversation.service"
import { MessageService } from "#/services/message.service"

import express from "express"

const messageRoutes = express.Router()

const messageService = new MessageService()

const conversationService = new ConversationService(messageService)

const controller = new MessageController(messageService, conversationService)

// List of newest messages in specific conversation
messageRoutes.get("/:conversationId", controller.getMessages)

// Send new message to conversation
messageRoutes.post("/", checkFriendship, controller.sendMessage)

// Edit a specific message in conversation
messageRoutes.put("/:messageId", controller.editMessage)

// Recall a specific message in conversation (For everyone)
messageRoutes.delete("/:messageId", controller.recallMessage)

// Hide a message in conversation (For only current user)
messageRoutes.delete("/:messageId", controller.hideMessage)

export default messageRoutes

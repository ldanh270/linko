import { ConversationController } from "#/controllers/conversation.controller"
import participantRoutes from "#/routes/conversationRoutes/participant.route"
import { ConversationService } from "#/services/conversation.service"
import { MessageService } from "#/services/message.service"

import express from "express"

const conversationRoutes = express.Router()

const messageService = new MessageService()
const conversationService = new ConversationService(messageService)
const controller = new ConversationController(conversationService)

// List of recent conversations
conversationRoutes.get("/", controller.getConversations)

// Group/Conversation info
conversationRoutes.get("/:conversationId", controller.getConversationInfo)

// Create new conversation (Only for group conversation)
conversationRoutes.post("/", controller.createNewGroup)

// Update conversation info
conversationRoutes.put("/:conversationId", controller.updateConversation)

// Delete Group
conversationRoutes.delete("/:conversationId", controller.deleteGroup)

// Delete conversation history (Only for current user)
conversationRoutes.delete("/:conversationId/history", controller.deleteConversationHistory)

// Participants (Members)
conversationRoutes.use("/:conversationId/participants", participantRoutes)

export default conversationRoutes

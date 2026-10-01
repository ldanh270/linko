import { HttpStatusCode } from "#/configs/constants/httpStatusCode"
import { ConversationService } from "#/services/conversation.service"

import { Request, Response } from "express"
import mongoose, { Date } from "mongoose"

type PopulatedParticipantsType = {
    userId: {
        _id: mongoose.Types.ObjectId
        avatar?: {
            url?: string
            id?: string
        }
        background?: {
            url?: string
            id?: string
        }
        displayName: string
    }
    role: "OWNER" | "ADMIN" | "MEMBER" | "DIRECT"
    isArchived: boolean
    mutedUntil: Date
    clearedHistoryAt: Date
    joinedAt: Date
}

export class ConversationController {
    constructor(private readonly service: ConversationService) {}

    /**
     *
     * @param req Current user id (res.user)
     * @param res Latest conversation list (res.body)
     */
    getConversations = async (req: Request, res: Response) => {
        try {
            const userId = req.user._id.toString()

            // Validate
            if (!userId)
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    message: "Unauthorized",
                })
            // Get conversation list
            const conversations = await this.service.getConversations(userId)

            // Return formatted conversation list to display
            const formatted = conversations.map((conversation) => {
                /**
                 * Double casting to avoid conflict
                 * Example:
                 * - Mongoose return types - userId: mongoose.Types.ObjectId
                 * - Self declare types - userId:
                 *  {
                 *      _id: mongoose.Types.ObjectId,
                 *      avatar: {
                 *          url: string,
                 *          id: string
                 *      }
                 *  }
                 *  => Must cast to unknown before self declare type
                 */
                const participantList =
                    conversation.participants as unknown as PopulatedParticipantsType[]

                // Formatted participants
                const participants = participantList.map((p: PopulatedParticipantsType) => ({
                    _id: p.userId?._id,
                    displayName: p.userId?.displayName,
                    avatarUrl: p.userId?.avatar?.url ?? null,
                    joinedAt: p.joinedAt,
                }))

                // Return conversations
                return {
                    // Other conversation data & remove trash meta-data of mongoose
                    ...conversation.toObject(),
                    unreadCount: conversation.unreadCount || {},
                    // Formatted participants data
                    participants,
                }
            })

            // Response formatted conversations
            return res.status(HttpStatusCode.OK).json({ conversations: formatted })
        } catch (error) {
            console.error(
                "ConversationController - getConversations error:" + (error as Error).message,
            )
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // Group/Conversation info
    getConversationInfo = async (req: Request, res: Response) => {}

    // Create new conversation (Only for group conversation)
    createNewGroup = async (req: Request, res: Response) => {
        try {
            const userId = req.user._id.toString()
            const { name, description, memberIds } = req.body

            // Validate
            if (!name || !memberIds || !Array.isArray(memberIds)) {
                return res
                    .status(HttpStatusCode.BAD_REQUEST)
                    .json({ message: "Both 'name' & 'memberIds' is required" })
            }

            // Group members must > 2 (group members = current user (1) + members)
            if (memberIds.length < 2)
                return res
                    .status(HttpStatusCode.BAD_REQUEST)
                    .json({ message: "Group members must greater than 2" })

            // Create conversation
            const conversation = await this.service.createConversation({
                userId,
                type: "GROUP",
                memberIds,
                name,
                description,
            })

            return res.status(201).json({ conversation })
        } catch (error) {
            console.error(
                "ConversationController - createNewGroup error:" + (error as Error).message,
            )
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // Update conversation info (Check for group & direct)
    updateConversation = async (req: Request, res: Response) => {}

    // Delete group
    deleteGroup = async (req: Request, res: Response) => {}

    // Delete conversation history (Only for current user)
    deleteConversationHistory = async (req: Request, res: Response) => {}
}

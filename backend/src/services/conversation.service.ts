import { HttpStatusCode } from "#/configs/constants/httpStatusCode"
import Conversation, { ConversationType } from "#/models/Conversation"
import Friendship from "#/models/Friendship"
import { MessageService } from "#/services/message.service"

import mongoose, { HydratedDocument } from "mongoose"

type InitConversationParamsType = {
    senderId: string
    recipientId: string
    content?: string
    attachments?: {
        url: string
        id: string
    }[]
}

export class ConversationService {
    constructor(private readonly messageService: MessageService) {}

    // Find conversation by id (string)
    findConversationById = async (conversationId?: string) => {
        const conversation = await Conversation.findById(conversationId)

        // Conversation found
        if (!conversation) return null

        // Conversation not found
        return conversation
    }

    // Find conversation by participants id (Only for direct message)
    findConversationByParticipants = async (users: string[]) => {
        const members = [...new Set(users)].sort((a: string, b: string) => a.localeCompare(b))

        const conversation = await Conversation.findOne({
            "participants.userId": { $all: members },
            conversationType: "DIRECT",
        })

        if (conversation) console.error("gm")

        return conversation
    }

    // Check user is conversation participants
    isUserInConversation = async ({
        conversationId,
        userId,
    }: {
        conversationId: string
        userId: string
    }) => {
        return Conversation.findOne({
            _id: conversationId,
            "participants.userId": { $in: [userId] },
        })
    }

    // Check users are friends
    isUsersBeFriends = async (userA: string, userB: string) => {
        // Swap if userA > userB to indexing
        if (userA > userB) [userA, userB] = [userB, userA]

        return Friendship.findOne({ userA, userB })
    }

    // Get conversations list
    getConversations = async (userId: string) => {
        return Conversation.find({ "participants.userId": userId })
            .sort({
                lastMessageAt: -1,
                updatedAt: -1,
            })
            .populate({ path: "participants.userId", select: "displayName avatar.url" })
            .populate({ path: "lastMessage.senderId", select: "displayName avatar.url" })
            .populate({ path: "seenBy", select: "displayName avatar.url" })
    }

    // Create new conversation
    createConversation = async ({
        conversationId,
        userId,
        type,
        memberIds,
        name,
        description,
    }: {
        conversationId?: string
        userId: string
        type: "DIRECT" | "GROUP"
        memberIds: string[]
        name?: string
        description?: string
    }) => {
        let conversation: HydratedDocument<ConversationType>
        const _id = conversationId ? conversationId : new mongoose.Types.ObjectId()

        const ownerIdStr = userId.toString()

        const uniqueMemberIds = [...new Set(memberIds)].filter((id) => id.toString() !== ownerIdStr)

        if (type === "DIRECT") {
            const participantId = uniqueMemberIds[0]

            conversation = await Conversation.findOne({
                type: "DIRECT",
                "participants.userId": { $all: [userId, participantId] },
            })

            if (!conversation) {
                conversation = new Conversation({
                    _id,
                    conversationType: "DIRECT",
                    participants: [
                        { userId, role: "DIRECT" },
                        { userId: participantId, role: "DIRECT" },
                    ],
                })
            }

            await conversation.save()
        }

        if (type === "GROUP") {
            conversation = new Conversation({
                _id,
                conversationType: "GROUP",
                group: {
                    name,
                    ownerId: userId,
                    description,
                },
                participants: [
                    { userId, role: "OWNER" },
                    ...memberIds.map((id) => ({ userId: id, role: "MEMBER" })),
                ],
            })

            await conversation.save()
        }

        // If type different with 'DIRECT' & 'GROUP'
        if (!conversation) throw new Error("Conversation type invalid")

        await conversation.populate([
            // Select name & avatar url of participants in conversation
            { path: "participants.userId", select: "displayName avatar.url" },
            // Select name & avatar url of last message's sender
            { path: "lastMessage.senderId", select: "displayName avatar.url" },
            // Display avatar & display name of seen users
            { path: "seenBy", select: "displayName avatar.url" },
        ])

        return conversation
    }
}

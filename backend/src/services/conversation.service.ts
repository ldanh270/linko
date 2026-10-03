import { CONVERSATION_TYPE, ROLE } from "@linko/contracts"
import Conversation, { ConversationType } from "#/models/Conversation"
import Friendship from "#/models/Friendship"

import mongoose, { HydratedDocument } from "mongoose"

export class ConversationService {
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
            conversationType: CONVERSATION_TYPE.DIRECT,
        })

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

    // Create a direct conversation for the message flow. Group creation lives in the feature module.
    createConversation = async ({
        conversationId,
        userId,
        memberIds,
    }: {
        conversationId?: string
        userId: string
        type: typeof CONVERSATION_TYPE.DIRECT
        memberIds: string[]
    }) => {
        let conversation: HydratedDocument<ConversationType> | null = null
        const _id = conversationId ? conversationId : new mongoose.Types.ObjectId()
        const participantId = [...new Set(memberIds)].find((id) => id !== userId)
        if (!participantId) throw new Error("A direct conversation requires a recipient")

        conversation = await Conversation.findOne({
            conversationType: CONVERSATION_TYPE.DIRECT,
            "participants.userId": { $all: [userId, participantId] },
        })
        if (!conversation) {
            conversation = new Conversation({
                _id,
                conversationType: CONVERSATION_TYPE.DIRECT,
                participants: [
                    { userId, role: ROLE.DIRECT },
                    { userId: participantId, role: ROLE.DIRECT },
                ],
            })
        }
        await conversation.save()

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

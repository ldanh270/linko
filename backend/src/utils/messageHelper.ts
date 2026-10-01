import { ConversationType } from "#/models/Conversation"
import { MessageType } from "#/models/Message"

import { HydratedDocument } from "mongoose"

export const updateConversationAfterCreateMessage = ({
    conversation,
    message,
    senderId,
}: {
    conversation: HydratedDocument<ConversationType>
    message: HydratedDocument<MessageType>
    senderId: string
}) => {
    conversation.set({
        lastMessage: {
            _id: message._id,
            content: message.content,
            senderId,
            createdAt: message.createdAt,
        },
    })

    conversation.participants.forEach((participant) => {
        // Check each participant in conversation
        const memberId = participant.userId.toString()

        // Check specific participant (member) is message sender
        const isSender = memberId === senderId.toString()

        // Get previous unread message count for each participant
        const prevCount = conversation.unreadCount.get(memberId) || 0

        // If participant is message sender -> Unread count = 0. Else -> Unread count += 1
        conversation.unreadCount.set(memberId, isSender ? 0 : prevCount + 1)
    })
}

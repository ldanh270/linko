import Message from "#/models/Message"

import mongoose, { Types } from "mongoose"

type MessageType = {
    conversationId: Types.ObjectId
    senderId: string
    content?: string
    attachments?: {
        url?: string
        id: string
        name?: string
        contentType?: string
        size?: number
    }[]
    replyTo?: string | null
    mentions?: string[]
}

type QueryType = { conversationId: string; createdAt?: Object }

export class MessageService {
    sendMessageToConversation = async ({
        conversationId,
        senderId,
        content,
        attachments,
        replyTo = null,
        mentions = [],
    }: MessageType) => {
        const message = new Message({
            conversationId: conversationId,
            senderId: new mongoose.Types.ObjectId(senderId),
            content,
            attachments,
            replyTo: replyTo ? new mongoose.Types.ObjectId(replyTo) : undefined,
            mentions: mentions ? mentions.map((id) => new mongoose.Types.ObjectId(id)) : [],
        })
        await message.save()

        return message
    }

    getMessages = async ({
        query,
        cursor,
        limit,
    }: {
        query: QueryType
        cursor: string
        limit: number
    }) => {
        // If exists cursor => Continue fetch at cursor
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor.toString()) }
        }

        let messages = await Message.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit) + 1)

        let nextCursor = null

        if (messages.length > Number(limit)) {
            const nextMessage = messages[messages.length - 1]
            nextCursor = nextMessage.createdAt.toISOString()
            messages.pop()
        }

        messages = messages.reverse()

        return [messages, nextCursor] as const
    }
}

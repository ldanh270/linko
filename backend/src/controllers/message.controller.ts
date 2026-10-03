import { HttpStatusCode } from "#/configs/constants/httpStatusCode"
import { isMessageAttachmentMimeType } from "#/configs/uploadPolicy.config"
import Message from "#/models/Message"
import { ConversationService } from "#/services/conversation.service"
import { MessageService } from "#/services/message.service"
import {
    deleteMessageAttachments,
    getMessageAttachmentDownloadUrl,
    getMessageAttachmentObject,
    storeMessageAttachments,
} from "#/services/messageAttachment.service"
import {
    InvalidMessageAttachmentError,
    sanitizeAttachmentFilename,
} from "#/utils/messageAttachmentValidation.util"
import { updateConversationAfterCreateMessage } from "#/utils/messageHelper"

import { Request, Response } from "express"
import mongoose from "mongoose"

type QueryType = { conversationId: string; createdAt?: Object }

const getAttachmentContentDisposition = (filename: string) => {
    const fallbackName =
        filename.replace(/[^\x20-\x7e]|["\\]/g, "_").slice(0, 180) || "attachment"
    const encodedFilename = encodeURIComponent(filename).replace(/[!'()*]/g, (char) =>
        `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedFilename}`
}

const respondAttachmentNotFound = (res: Response) =>
    res.status(HttpStatusCode.NOT_FOUND).json({ message: "Attachment not found" })

export class MessageController {
    constructor(
        private readonly messageService: MessageService,
        private readonly conversationService: ConversationService,
    ) {}

    private serializeMessage = (message: any) => {
        const serialized = message.toObject()
        serialized.attachments = (serialized.attachments ?? []).map((attachment: any) => {
            if (!attachment.id?.startsWith("r2:")) return attachment
            return {
                ...attachment,
                id: attachment._id.toString(),
                url: getMessageAttachmentDownloadUrl(
                    serialized._id.toString(),
                    attachment._id.toString(),
                ),
            }
        })
        return serialized
    }

    // Send message to conversation (direct or group)
    sendMessage = async (req: Request, res: Response) => {
        try {
            const senderId = req.user._id.toString()
            const { conversationId, recipientId, content, replyTo, mentions } = req.body
            const files = Array.isArray(req.files) ? req.files : []
            let parsedMentions: string[] = []

            if (mentions !== undefined && mentions !== "") {
                try {
                    parsedMentions =
                        typeof mentions === "string"
                            ? JSON.parse(mentions)
                            : req.is("multipart/form-data")
                              ? null
                              : mentions
                } catch {
                    return res.status(HttpStatusCode.BAD_REQUEST).json({
                        message: "'mentions' must be a JSON array of user IDs",
                    })
                }
                if (
                    !Array.isArray(parsedMentions) ||
                    parsedMentions.some((mention) => typeof mention !== "string")
                ) {
                    return res.status(HttpStatusCode.BAD_REQUEST).json({
                        message: "'mentions' must be a JSON array of user IDs",
                    })
                }
            }

            if (Object.prototype.hasOwnProperty.call(req.body, "attachments")) {
                return res.status(HttpStatusCode.BAD_REQUEST).json({
                    message: "Send attachment bytes as multipart 'attachments' files",
                })
            }

            if (content !== undefined && typeof content !== "string") {
                return res
                    .status(HttpStatusCode.BAD_REQUEST)
                    .json({ message: "Invalid message content" })
            }
            if (replyTo !== undefined && typeof replyTo !== "string") {
                return res
                    .status(HttpStatusCode.BAD_REQUEST)
                    .json({ message: "Invalid replyTo value" })
            }
            if (
                (conversationId !== undefined && typeof conversationId !== "string") ||
                (recipientId !== undefined && typeof recipientId !== "string")
            ) {
                return res
                    .status(HttpStatusCode.BAD_REQUEST)
                    .json({ message: "Invalid conversation fields" })
            }

            /**
             * VALIDATE
             */

            // Existing conversations use conversationId; a first direct message uses recipientId.
            if (!conversationId && !recipientId)
                return res
                    .status(HttpStatusCode.BAD_REQUEST)
                    .json({ message: "Either 'conversationId' or 'recipientId' is required" })

            // Accept exactly one conversation target.
            if (conversationId && recipientId)
                return res.status(HttpStatusCode.BAD_REQUEST).json({
                    message:
                        "Only one of 'conversationId' or 'recipientId' can be provided, not both.",
                })

            // Message must have either content or attachments
            if (!content?.trim() && files.length === 0)
                return res
                    .status(HttpStatusCode.BAD_REQUEST)
                    .json({ message: "Either 'content' or 'attachments' is required" })

            // Recipient must different with sender
            if (recipientId && senderId === recipientId)
                return res.status(HttpStatusCode.BAD_REQUEST).json({
                    message: "Sender and recipient can not be the same",
                })

            /**
             * CREATE CONVERSATION
             */

            // Create new conversation & add message if not created
            let conversation = null

            if (conversationId) {
                // If having conversationId
                conversation = await this.conversationService.findConversationById(conversationId)

                if (!conversation)
                    return res
                        .status(HttpStatusCode.BAD_REQUEST)
                        .json({ message: "Conversation not found" })

                // Check user is conversation participants
                if (
                    !(await this.conversationService.isUserInConversation({
                        conversationId,
                        userId: senderId,
                    }))
                ) {
                    return res
                        .status(HttpStatusCode.FORBIDDEN)
                        .json({ message: "User not in conversation" })
                }
            } else if (recipientId) {
                // Authenticate direct-message access before any private R2 write.
                if (!(await this.conversationService.isUsersBeFriends(senderId, recipientId))) {
                    return res
                        .status(HttpStatusCode.FORBIDDEN)
                        .json({ message: "Users are not friends" })
                }

                // If having recipientId
                conversation = await this.conversationService.findConversationByParticipants([
                    senderId,
                    recipientId,
                ])
            }

            const storedAttachments = files.length
                ? await storeMessageAttachments({ userId: senderId, files })
                : []
            let createdMessage: any

            try {
                if (!conversation) {
                    conversation = await this.conversationService.createConversation({
                        userId: senderId,
                        type: "DIRECT",
                        memberIds: [senderId, recipientId],
                    })
                }

                createdMessage = await this.messageService.sendMessageToConversation({
                    conversationId: conversation._id,
                    senderId,
                    content,
                    attachments: storedAttachments,
                    replyTo,
                    mentions: parsedMentions,
                })

                updateConversationAfterCreateMessage({
                    conversation,
                    message: createdMessage,
                    senderId,
                })
                await conversation.save()

                return res.status(HttpStatusCode.CREATED).json({
                    conversation,
                    message: this.serializeMessage(createdMessage),
                })
            } catch (error) {
                if (createdMessage?._id) {
                    try {
                        // NOTE: Compensate a message creation that never committed to the conversation.
                        await Message.collection.deleteOne({ _id: createdMessage._id })
                    } catch (cleanupError) {
                        console.error(
                            "Failed to clean up unsaved message after conversation update",
                            cleanupError,
                        )
                    }
                }
                if (storedAttachments.length) {
                    try {
                        await deleteMessageAttachments(storedAttachments)
                    } catch (cleanupError) {
                        console.error(
                            "Failed to clean up message attachments after database error",
                            cleanupError,
                        )
                    }
                }
                throw error
            }
        } catch (error) {
            if (error instanceof InvalidMessageAttachmentError) {
                return res.status(HttpStatusCode.BAD_REQUEST).json({ message: error.message })
            }
            console.error("MessageController - sendMessage error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // Get latest message in a conversation
    getMessages = async (req: Request, res: Response) => {
        try {
            const { conversationId } = req.params
            if (typeof conversationId !== "string") {
                return res.status(HttpStatusCode.BAD_REQUEST).json({ message: "Invalid conversation id" })
            }
            const userId = req.user?._id.toString()
            const { limit = 50, cursor } = req.query

            const query: QueryType = { conversationId }

            // Check user is conversation participants
            if (
                !(await this.conversationService.isUserInConversation({ conversationId, userId }))
            ) {
                return res
                    .status(HttpStatusCode.FORBIDDEN)
                    .json({ messsage: "User not in conversation" })
            }

            // Get messages in conversation & update cursor
            const [messages, nextCursor] = await this.messageService.getMessages({
                query,
                cursor: cursor as string,
                limit: Number(limit),
            })

            return res.status(200).json({
                messages: messages.map((message: any) => this.serializeMessage(message)),
                nextCursor,
            })
        } catch (error) {
            console.error("MessageController - getMessages error:" + (error as Error).message)
            res.status(HttpStatusCode.INTERNAL_SERVER).json({ message: "Internal server error" })
        }
    }

    // Stream a private R2 attachment only after checking conversation membership.
    downloadAttachment = async (req: Request, res: Response) => {
        try {
            const { messageId, attachmentId } = req.params
            if (!mongoose.isValidObjectId(messageId) || !mongoose.isValidObjectId(attachmentId)) {
                return respondAttachmentNotFound(res)
            }

            const message = await Message.findById(messageId)
            if (!message) {
                return respondAttachmentNotFound(res)
            }
            const attachment = message.attachments.find(
                (item: any) => item._id?.toString() === attachmentId,
            ) as any
            if (!attachment?.id?.startsWith("r2:attachments/")) {
                return respondAttachmentNotFound(res)
            }

            const isMember = await this.conversationService.isUserInConversation({
                conversationId: message.conversationId.toString(),
                userId: req.user._id.toString(),
            })
            if (!isMember) {
                return respondAttachmentNotFound(res)
            }

            const attachmentType = attachment.contentType as string | undefined
            if (
                !attachmentType ||
                !isMessageAttachmentMimeType(attachmentType) ||
                !attachment.name
            ) {
                return respondAttachmentNotFound(res)
            }

            const object = await getMessageAttachmentObject(attachment.id.slice(3))
            const filename = sanitizeAttachmentFilename(attachment.name)
            res.setHeader("Content-Type", attachmentType)
            res.setHeader("Content-Disposition", getAttachmentContentDisposition(filename))
            res.setHeader("X-Content-Type-Options", "nosniff")
            res.setHeader("Cache-Control", "private, no-store")
            if (Number.isFinite(attachment.size) && attachment.size >= 0) {
                res.setHeader("Content-Length", String(attachment.size))
            } else if (object.contentLength !== undefined) {
                res.setHeader("Content-Length", String(object.contentLength))
            }

            object.body.on("error", (error) => {
                console.error("R2 attachment stream failed", error)
                res.destroy(error)
            })
            object.body.pipe(res)
        } catch (error: any) {
            if (res.headersSent) {
                res.destroy(error)
                return
            }
            const status =
                error?.$metadata?.httpStatusCode === 404 ? 404 : HttpStatusCode.INTERNAL_SERVER
            return res.status(status).json({
                message: status === 404 ? "Attachment not found" : "Internal server error",
            })
        }
    }

    // Edit a specific message
    editMessage = async (req: Request, res: Response) => {}

    // Recall a specific message
    recallMessage = async (req: Request, res: Response) => {}

    // Hide a message for me
    hideMessage = async (req: Request, res: Response) => {}
}

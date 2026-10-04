import {
    MESSAGE_FIELDS,
    MESSAGE_LIMITS,
    MESSAGE_PARAMS,
    MESSAGE_QUERY_PARAMS,
    type ApiEnvelope,
    type CursorPage,
    type MessageDto,
    type SendMessageRequest,
} from "@linko/contracts"
import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ApiResponse } from "../../shared/http/ApiResponse"
import { MESSAGE_OPERATION_FIELDS } from "./message.constants"
import { MessageService } from "./message.service"

type MessageRequestHandler<Body, Data> = RequestHandler<Record<string, string>, ApiEnvelope<Data>, Body>
type EmptyRequestBody = Record<string, never>

/** Translate authenticated message HTTP requests into one service operation.
 *
 * @layer Controller
 */
export class MessageController {
    /** Bind the domain service without coupling it to Express request state. */
    constructor(private readonly service: MessageService) {}

    /** Persist one validated message and return its stable safe DTO. */
    readonly send: MessageRequestHandler<SendMessageRequest, MessageDto> = async (request, response) => {
        const message = await this.service.send({
            [MESSAGE_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(
                request.body[MESSAGE_FIELDS.CONVERSATION_ID],
            ),
            [MESSAGE_OPERATION_FIELDS.SENDER_ID]: request.user._id,
            [MESSAGE_OPERATION_FIELDS.CLIENT_MESSAGE_ID]: request.body[MESSAGE_FIELDS.CLIENT_MESSAGE_ID],
            [MESSAGE_OPERATION_FIELDS.CONTENT]: request.body[MESSAGE_FIELDS.CONTENT],
            replyToId: request.body[MESSAGE_FIELDS.REPLY_TO]
                ? new mongoose.Types.ObjectId(request.body[MESSAGE_FIELDS.REPLY_TO])
                : null,
            mentionIds: request.body[MESSAGE_FIELDS.MENTIONS]?.map((mentionId) =>
                new mongoose.Types.ObjectId(mentionId),
            ) ?? [],
            attachments: Array.isArray(request.files)
                ? request.files.map((file) => ({
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    buffer: file.buffer,
                    size: file.size,
                }))
                : [],
        })
        response.status(HttpStatusCode.CREATED).json(ApiResponse.ok(message))
    }

    /** Return a bounded chronological page visible to the current membership. */
    readonly list: MessageRequestHandler<EmptyRequestBody, CursorPage<MessageDto>> = async (request, response) => {
        const rawCursor = request.query[MESSAGE_QUERY_PARAMS.CURSOR]
        const rawLimit = request.query[MESSAGE_QUERY_PARAMS.LIMIT]
        const page = await this.service.list({
            [MESSAGE_OPERATION_FIELDS.CONVERSATION_ID]: new mongoose.Types.ObjectId(
                request.params[MESSAGE_PARAMS.CONVERSATION_ID],
            ),
            [MESSAGE_OPERATION_FIELDS.USER_ID]: request.user._id,
            cursor: typeof rawCursor === "string" ? rawCursor : undefined,
            limit: Number(rawLimit ?? MESSAGE_LIMITS.DEFAULT_PAGE_SIZE),
        })
        response.status(HttpStatusCode.OK).json(ApiResponse.ok(page))
    }
}

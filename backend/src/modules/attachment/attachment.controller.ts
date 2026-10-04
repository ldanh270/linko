import type { RequestHandler } from "express"
import mongoose from "mongoose"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { ValidationException } from "../../shared/errors/ValidationException"
import {
    ATTACHMENT_DOWNLOAD_HEADERS,
    ATTACHMENT_ERROR_MESSAGES,
    ATTACHMENT_ROUTE_PARAMS,
} from "./attachment.constants"
import type { AttachmentService } from "./attachment.service"
import type { DownloadAttachmentInput } from "./attachment.types"

/** Serve validated private attachment streams to currently authorized members.
 *
 * @layer Controller
 */
export class AttachmentController {
    /** Inject the service that checks membership and resolves private object streams. */
    constructor(private readonly service: AttachmentService) {}

    /** Stream one file with safe download headers and no object-store URL. */
    readonly download: RequestHandler = async (request, response, next) => {
        const messageId = request.params[ATTACHMENT_ROUTE_PARAMS.MESSAGE_ID]
        const attachmentId = request.params[ATTACHMENT_ROUTE_PARAMS.ATTACHMENT_ID]
        if (typeof messageId !== "string" || typeof attachmentId !== "string") {
            next(new ValidationException(ATTACHMENT_ERROR_MESSAGES.INVALID_ROUTE_PARAMS))
            return
        }
        const input: DownloadAttachmentInput = {
            messageId: new mongoose.Types.ObjectId(messageId),
            attachmentId: new mongoose.Types.ObjectId(attachmentId),
            userId: request.user._id,
        }
        const attachment = await this.service.download(input)
        response.status(HttpStatusCode.OK)
        response.setHeader(ATTACHMENT_DOWNLOAD_HEADERS.CONTENT_TYPE, attachment.contentType)
        response.setHeader(
            ATTACHMENT_DOWNLOAD_HEADERS.CONTENT_DISPOSITION,
            createAttachmentContentDisposition(attachment.name),
        )
        response.setHeader(ATTACHMENT_DOWNLOAD_HEADERS.CONTENT_LENGTH, String(attachment.size))
        response.setHeader(ATTACHMENT_DOWNLOAD_HEADERS.CACHE_CONTROL, ATTACHMENT_DOWNLOAD_HEADERS.CACHE_POLICY)
        response.setHeader(
            ATTACHMENT_DOWNLOAD_HEADERS.CONTENT_SNIFFING,
            ATTACHMENT_DOWNLOAD_HEADERS.CONTENT_SNIFFING_POLICY,
        )
        attachment.body.once("error", (error: Error) => {
            if (response.headersSent) {
                response.destroy(error)
                return
            }
            next(error)
        })
        attachment.body.pipe(response)
    }
}

function createAttachmentContentDisposition(filename: string): string {
    const fallbackName = filename.replace(
        ATTACHMENT_DOWNLOAD_HEADERS.ASCII_FALLBACK_PATTERN,
        ATTACHMENT_DOWNLOAD_HEADERS.FALLBACK_REPLACEMENT,
    ) || ATTACHMENT_DOWNLOAD_HEADERS.FALLBACK_FILENAME
    const encodedFilename = encodeURIComponent(filename).replace(
        ATTACHMENT_DOWNLOAD_HEADERS.RFC_5987_ESCAPE_PATTERN,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    return `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedFilename}`
}

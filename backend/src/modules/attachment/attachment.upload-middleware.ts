import { MESSAGE_FIELDS } from "@linko/contracts"
import multer from "multer"
import type { RequestHandler } from "express"

import {
    MAX_MESSAGE_ATTACHMENT_COUNT,
    MAX_UPLOAD_FILE_SIZE_BYTES,
    isMessageAttachmentMimeType,
    normalizeUploadMimeType,
} from "../../configs/uploadPolicy.config"
import { ValidationException } from "../../shared/errors/ValidationException"
import { ATTACHMENT_ERROR_MESSAGES } from "./attachment.constants"

const parseMultipartFiles = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
        files: MAX_MESSAGE_ATTACHMENT_COUNT,
    },
    fileFilter: (_request, file, callback) => {
        if (!isMessageAttachmentMimeType(normalizeUploadMimeType(file.mimetype))) {
            callback(new Error(ATTACHMENT_ERROR_MESSAGES.INVALID_UPLOAD))
            return
        }
        callback(null, true)
    },
}).array(MESSAGE_FIELDS.ATTACHMENTS, MAX_MESSAGE_ATTACHMENT_COUNT)

/** Parse bounded attachment bytes and translate Multer failures to the shared error envelope. */
export const parseMessageAttachments: RequestHandler = (request, response, next) => {
    parseMultipartFiles(request, response, (error: unknown) => {
        if (error) {
            next(new ValidationException(ATTACHMENT_ERROR_MESSAGES.INVALID_UPLOAD))
            return
        }
        next()
    })
}

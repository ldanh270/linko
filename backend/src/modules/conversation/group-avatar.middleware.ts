import { GROUP_FIELDS, ERROR_CODES } from "@linko/contracts"
import multer from "multer"
import type { RequestHandler } from "express"

import {
    MAX_UPLOAD_FILE_SIZE_BYTES,
    isProfileImageMimeType,
    MULTER_ERROR_CODES,
    normalizeUploadMimeType,
} from "../../configs/uploadPolicy.config"
import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { BusinessException } from "../../shared/errors/BusinessException"
import { ValidationException } from "../../shared/errors/ValidationException"
import { GROUP_MESSAGES } from "./conversation.constants"

const groupAvatarParser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES, files: 1 },
    fileFilter: (_request, file, callback) => {
        if (!isProfileImageMimeType(normalizeUploadMimeType(file.mimetype))) {
            callback(new ValidationException(GROUP_MESSAGES.INVALID_AVATAR))
            return
        }
        callback(null, true)
    },
}).single(GROUP_FIELDS.AVATAR)

/** Parse one optional group avatar and map client upload failures to the global error boundary. */
export const parseGroupAvatar: RequestHandler = (request, response, next) => {
    groupAvatarParser(request, response, (error: unknown) => {
        if (!error) {
            next()
            return
        }
        next(mapGroupAvatarUploadError(error))
    })
}

function mapGroupAvatarUploadError(error: unknown): unknown {
    if (error instanceof BusinessException) return error
    if (!(error instanceof multer.MulterError)) return error
    if (error.code === MULTER_ERROR_CODES.FILE_SIZE_LIMIT) {
        return new BusinessException(
            ERROR_CODES.VALIDATION,
            HttpStatusCode.PAYLOAD_TOO_LARGE,
            GROUP_MESSAGES.AVATAR_TOO_LARGE,
        )
    }
    return new ValidationException(GROUP_MESSAGES.INVALID_AVATAR)
}

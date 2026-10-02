import multer from "multer"
import type { RequestHandler } from "express"

import {
    isProfileImageMimeType,
    MAX_UPLOAD_FILE_SIZE_BYTES,
    MULTER_ERROR_CODES,
    normalizeUploadMimeType,
} from "../../configs/uploadPolicy.config"
import { ValidationException } from "../../shared/errors/ValidationException"
import { PROFILE_FIELDS, PROFILE_MESSAGES } from "./profile.constants"

const memoryStorage = multer.memoryStorage()
const parser = multer({
    storage: memoryStorage,
    limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES, files: 2 },
    fileFilter: (_request, file, callback) => {
        if (isProfileImageMimeType(normalizeUploadMimeType(file.mimetype))) {
            callback(null, true)
            return
        }
        callback(new ValidationException(PROFILE_MESSAGES.INVALID_IMAGE))
    },
}).fields([
    { name: PROFILE_FIELDS.AVATAR, maxCount: 1 },
    { name: PROFILE_FIELDS.BACKGROUND, maxCount: 1 },
])

/** Parse profile images into memory and send upload failures through the global error handler. */
export const parseProfileImages: RequestHandler = (request, response, next) => {
    parser(request, response, (error: unknown) => {
        if (!error) {
            next()
            return
        }
        if (error instanceof ValidationException) {
            next(error)
            return
        }
        if (error instanceof multer.MulterError && error.code === MULTER_ERROR_CODES.FILE_SIZE_LIMIT) {
            next(new ValidationException(PROFILE_MESSAGES.INVALID_IMAGE))
            return
        }
        next(new ValidationException(PROFILE_MESSAGES.INVALID_IMAGE))
    })
}

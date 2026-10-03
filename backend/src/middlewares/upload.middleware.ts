import multer from "multer"
import { NextFunction, Request, RequestHandler, Response } from "express"
import {
    isMessageAttachmentMimeType,
    isProfileImageMimeType,
    MAX_MESSAGE_ATTACHMENT_COUNT,
    MAX_UPLOAD_FILE_SIZE_BYTES,
    MULTER_ERROR_CODES,
    normalizeUploadMimeType,
} from "#/configs/uploadPolicy.config"

const sendUploadError = (error: unknown, res: Response) => {
    if (error instanceof multer.MulterError && error.code === MULTER_ERROR_CODES.FILE_SIZE_LIMIT) {
        const maxSizeMiB = MAX_UPLOAD_FILE_SIZE_BYTES / 1024 / 1024
        return res
            .status(413)
            .json({ message: `Each uploaded file must be ${maxSizeMiB} MiB or smaller` })
    }
    if (error instanceof multer.MulterError && error.code === MULTER_ERROR_CODES.FILE_COUNT_LIMIT) {
        return res.status(400).json({ message: "Too many files in upload" })
    }
    return res.status(400).json({
        message: error instanceof Error ? error.message : "Invalid uploaded file",
    })
}

const wrapUpload = (middleware: RequestHandler) =>
    (req: Request, res: Response, next: NextFunction) =>
        middleware(req, res, (error) => (error ? sendUploadError(error, res) : next()))

const memoryStorage = multer.memoryStorage()

export const uploadProfileImages = wrapUpload(
    multer({
        storage: memoryStorage,
        limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES, files: 2 },
        fileFilter: (_req, file, callback) =>
            isProfileImageMimeType(normalizeUploadMimeType(file.mimetype))
                ? callback(null, true)
                : callback(new Error("Profile images must be JPEG, PNG, or WebP")),
    }).fields([
        { name: "avatar", maxCount: 1 },
        { name: "background", maxCount: 1 },
    ]),
)

export const parseMessageFiles = wrapUpload(
    multer({
        storage: memoryStorage,
        limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES, files: MAX_MESSAGE_ATTACHMENT_COUNT },
        fileFilter: (_req, file, callback) =>
            isMessageAttachmentMimeType(normalizeUploadMimeType(file.mimetype))
                ? callback(null, true)
                : callback(new Error("Unsupported attachment content type")),
    }).array("attachments", MAX_MESSAGE_ATTACHMENT_COUNT),
)

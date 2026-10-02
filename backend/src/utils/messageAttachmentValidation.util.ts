import {
    getMessageAttachmentSpec,
    MAX_UPLOAD_FILE_SIZE_BYTES,
    normalizeUploadMimeType,
    type MessageAttachmentSpec,
} from "#/configs/uploadPolicy.config"
import { isValidOpenXmlPackage } from "#/utils/openXmlValidation.util"

import { fileTypeFromBuffer } from "file-type"
import { extname } from "node:path"

export class InvalidMessageAttachmentError extends Error {}

const invalidAttachment = (message: string) => new InvalidMessageAttachmentError(message)

const validateTextAttachment = (buffer: Buffer) => {
    if (buffer.includes(0)) {
        throw invalidAttachment("Text attachments cannot contain NUL bytes")
    }

    let text: string
    try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer)
    } catch {
        throw invalidAttachment("Text attachments must contain valid UTF-8 and plain text only")
    }

    const textWithoutBom = text.replace(/^\uFEFF/, "")
    if (/<\s*(?:!doctype\s+html\b|html\b|svg\b|script\b)/i.test(textWithoutBom)) {
        throw invalidAttachment("HTML, SVG, and script attachments are not allowed")
    }
}

const validateBinaryAttachment = async (
    buffer: Buffer,
    mimeType: string,
    spec: MessageAttachmentSpec,
) => {
    let detectedType: Awaited<ReturnType<typeof fileTypeFromBuffer>>
    try {
        detectedType = await fileTypeFromBuffer(buffer)
    } catch {
        throw invalidAttachment("Attachment bytes do not match an allowed file type")
    }
    if (!detectedType) throw invalidAttachment("Attachment bytes do not match an allowed file type")

    if (spec.zipEntry) {
        if (detectedType.mime !== mimeType && detectedType.mime !== "application/zip") {
            throw invalidAttachment(
                "Office attachment bytes do not match the declared content type",
            )
        }
        if (!(await isValidOpenXmlPackage(buffer, spec))) {
            throw invalidAttachment("Invalid Office OpenXML attachment")
        }
        return
    }

    if (detectedType.mime !== mimeType) {
        throw invalidAttachment("Attachment bytes do not match the declared content type")
    }
}

export const validateMessageFile = async (file: Express.Multer.File) => {
    if (!file.buffer?.length) throw invalidAttachment("Empty attachments are not allowed")
    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES || file.buffer.length > MAX_UPLOAD_FILE_SIZE_BYTES) {
        const maxSizeMiB = MAX_UPLOAD_FILE_SIZE_BYTES / 1024 / 1024
        throw invalidAttachment(`Each attachment must be ${maxSizeMiB} MiB or smaller`)
    }

    const extension = extname(file.originalname).toLowerCase()
    const mimeType = normalizeUploadMimeType(file.mimetype)
    const spec = getMessageAttachmentSpec(mimeType)
    if (!spec || !spec.extensions.includes(extension)) {
        throw invalidAttachment(
            "Attachment content type and filename extension are not allowed or do not match",
        )
    }

    if (mimeType === "text/plain" || mimeType === "text/csv") {
        validateTextAttachment(file.buffer)
    } else {
        await validateBinaryAttachment(file.buffer, mimeType, spec)
    }

    return {
        name: sanitizeAttachmentFilename(file.originalname),
        contentType: mimeType,
        size: file.size,
    }
}

export const sanitizeAttachmentFilename = (originalname: string) => {
    const basename = originalname.replace(/\\/g, "/").split("/").pop() ?? "attachment"
    const safe = basename
        .normalize("NFC")
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, 180)
    return safe || "attachment"
}

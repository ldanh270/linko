export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_MESSAGE_ATTACHMENT_COUNT = 5

/** Multer limit codes mapped at HTTP upload boundaries. */
export const MULTER_ERROR_CODES = {
    FILE_SIZE_LIMIT: "LIMIT_FILE_SIZE",
    FILE_COUNT_LIMIT: "LIMIT_FILE_COUNT",
} as const

export const normalizeUploadMimeType = (mimeType: string) =>
    mimeType.split(";", 1)[0].trim().toLowerCase()

const profileImageFormatByMimeType = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
} as const

export const getProfileImageFormat = (mimeType: string) => {
    if (!Object.prototype.hasOwnProperty.call(profileImageFormatByMimeType, mimeType)) {
        return undefined
    }
    return profileImageFormatByMimeType[mimeType as keyof typeof profileImageFormatByMimeType]
}

export const isProfileImageMimeType = (mimeType: string) =>
    getProfileImageFormat(mimeType) !== undefined

export type MessageAttachmentSpec = {
    extensions: readonly string[]
    zipEntry?: string
    mainRoot?: string
    mainContentType?: string
}

export const MESSAGE_ATTACHMENT_SPECS: Record<string, MessageAttachmentSpec> = {
    "image/jpeg": { extensions: [".jpg", ".jpeg"] },
    "image/png": { extensions: [".png"] },
    "image/webp": { extensions: [".webp"] },
    "application/pdf": { extensions: [".pdf"] },
    "text/plain": { extensions: [".txt"] },
    "text/csv": { extensions: [".csv"] },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        extensions: [".docx"],
        zipEntry: "word/document.xml",
        mainRoot: "document",
        mainContentType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
    },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        extensions: [".xlsx"],
        zipEntry: "xl/workbook.xml",
        mainRoot: "workbook",
        mainContentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
        extensions: [".pptx"],
        zipEntry: "ppt/presentation.xml",
        mainRoot: "presentation",
        mainContentType:
            "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
    },
}

export const getMessageAttachmentSpec = (mimeType: string) => {
    if (!Object.prototype.hasOwnProperty.call(MESSAGE_ATTACHMENT_SPECS, mimeType)) {
        return undefined
    }
    return MESSAGE_ATTACHMENT_SPECS[mimeType]
}

export const isMessageAttachmentMimeType = (mimeType: string) =>
    getMessageAttachmentSpec(mimeType) !== undefined

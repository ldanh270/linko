import {
    API_ROUTES,
    ATTACHMENT_LIMITS,
    ATTACHMENT_PARAMS,
    ATTACHMENT_ROUTE_PATHS,
    MESSAGE_ATTACHMENT_FIELDS,
} from "@linko/contracts"

/** MongoDB fields stored on each message attachment subdocument. */
export const ATTACHMENT_FIELDS = {
    SUBDOCUMENT_ID: "_id",
    ID: MESSAGE_ATTACHMENT_FIELDS.ID,
    URL: MESSAGE_ATTACHMENT_FIELDS.URL,
    NAME: MESSAGE_ATTACHMENT_FIELDS.NAME,
    CONTENT_TYPE: MESSAGE_ATTACHMENT_FIELDS.CONTENT_TYPE,
    SIZE: MESSAGE_ATTACHMENT_FIELDS.SIZE,
} as const

/** Shared HTTP path components for protected attachment downloads. */
export const ATTACHMENT_ROUTE_PARAMS = ATTACHMENT_PARAMS

/** The internal identifier prefix for private R2 attachment objects. */
export const ATTACHMENT_STORAGE = {
    ID_PREFIX: "r2:",
    KEY_PREFIX: "attachments",
    PRIVATE_BUCKET: "private",
} as const

/** Stable messages returned by attachment business rules. */
export const ATTACHMENT_ERROR_MESSAGES = {
    TOO_MANY_FILES: `A message can have at most ${ATTACHMENT_LIMITS.MAX_FILE_COUNT} attachments`,
    NOT_FOUND: "Attachment not found",
    VALIDATED_METADATA_MISSING: "Validated attachment metadata is missing",
    CLEANUP_FAILED: "Attachment cleanup failed",
} as const

/** Safe operation labels used when cleanup failures are logged. */
export const ATTACHMENT_LOG_OPERATIONS = {
    CLEANUP_FAILED: "message_attachment_cleanup_failed",
} as const

/** Compose one protected attachment URL from message and subdocument IDs. */
export function createAttachmentDownloadPath(messageId: string, attachmentId: string): string {
    const messagePath = ATTACHMENT_ROUTE_PATHS.DOWNLOAD.replace(
        `:${ATTACHMENT_PARAMS.MESSAGE_ID}`,
        encodeURIComponent(messageId),
    ).replace(`:${ATTACHMENT_PARAMS.ATTACHMENT_ID}`, encodeURIComponent(attachmentId))
    return `${API_ROUTES.MESSAGES}${messagePath}`
}

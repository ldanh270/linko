import { MESSAGE_ATTACHMENT_FIELDS, type MessageAttachmentDto } from "@linko/contracts"

import { ATTACHMENT_STORAGE, createAttachmentDownloadPath } from "./attachment.constants"
import type { MessageAttachmentRecord } from "./attachment.types"

/** Map stored attachment metadata to a safe authenticated message DTO. */
export function toAttachmentDto(messageId: string, attachment: MessageAttachmentRecord): MessageAttachmentDto {
    const isPrivateR2Object = attachment.id.startsWith(
        `${ATTACHMENT_STORAGE.ID_PREFIX}${ATTACHMENT_STORAGE.KEY_PREFIX}/`,
    )
    return {
        [MESSAGE_ATTACHMENT_FIELDS.ID]: attachment.subdocumentId.toString(),
        [MESSAGE_ATTACHMENT_FIELDS.URL]: isPrivateR2Object
            ? createAttachmentDownloadPath(messageId, attachment.subdocumentId.toString())
            : attachment.url,
        [MESSAGE_ATTACHMENT_FIELDS.NAME]: attachment.name,
        [MESSAGE_ATTACHMENT_FIELDS.CONTENT_TYPE]: attachment.contentType,
        [MESSAGE_ATTACHMENT_FIELDS.SIZE]: attachment.size,
    }
}

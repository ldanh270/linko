import { MAX_MESSAGE_ATTACHMENT_COUNT } from "#/configs/uploadPolicy.config"
import { deleteR2Object, getPrivateR2Object, putR2Object } from "#/services/r2Storage.service"
import {
    InvalidMessageAttachmentError,
    validateMessageFile,
} from "#/utils/messageAttachmentValidation.util"

import { randomUUID } from "node:crypto"

export const storeMessageAttachments = async ({
    userId,
    files,
}: {
    userId: string
    files: Express.Multer.File[]
}): Promise<Array<{ id: string; name: string; contentType: string; size: number }>> => {
    if (files.length > MAX_MESSAGE_ATTACHMENT_COUNT) {
        throw new InvalidMessageAttachmentError(
            `A message can have at most ${MAX_MESSAGE_ATTACHMENT_COUNT} attachments`,
        )
    }

    const metadata = await Promise.all(files.map(validateMessageFile))
    const storedKeys: string[] = []

    try {
        for (let index = 0; index < files.length; index++) {
            const key = `attachments/${userId}/${randomUUID()}`
            await putR2Object({
                bucket: "private",
                key,
                body: files[index].buffer,
                contentType: metadata[index].contentType,
            })
            storedKeys.push(key)
        }
    } catch (error) {
        try {
            await deleteStoredObjects(storedKeys)
        } catch {
            // Preserve the upload error after attempting to remove earlier objects.
        }
        throw error
    }

    return storedKeys.map((key, index) => ({ id: `r2:${key}`, ...metadata[index] }))
}

export const deleteMessageAttachments = async (attachments: Array<{ id: string }>) => {
    const keys = attachments
        .filter(({ id }) => id.startsWith("r2:attachments/"))
        .map(({ id }) => id.slice(3))
    await deleteStoredObjects(keys)
}

const deleteStoredObjects = async (keys: string[]) => {
    const errors: unknown[] = []
    for (const key of keys) {
        try {
            await deleteR2Object({ bucket: "private", key })
        } catch (error) {
            console.error("Failed to clean up R2 message attachment", error)
            errors.push(error)
        }
    }
    if (errors.length) throw errors[0]
}

export const getMessageAttachmentDownloadUrl = (messageId: string, attachmentId: string) =>
    `/api/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`

export const getMessageAttachmentObject = getPrivateR2Object

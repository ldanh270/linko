import { ATTACHMENT_LIMITS, ERROR_CODES } from "@linko/contracts"
import { randomUUID } from "node:crypto"

import { HttpStatusCode } from "../../configs/constants/httpStatusCode"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import {
    InvalidMessageAttachmentError,
    sanitizeAttachmentFilename,
    validateMessageFile,
} from "../../utils/messageAttachmentValidation.util"
import { isMessageAttachmentMimeType } from "../../configs/uploadPolicy.config"
import {
    ATTACHMENT_ERROR_MESSAGES,
    ATTACHMENT_STORAGE,
} from "./attachment.constants"
import type {
    AttachmentServiceDependencies,
    AttachmentStream,
    DownloadAttachmentInput,
    MessageAttachmentPort,
    StoreAttachmentsInput,
    StoredAttachment,
} from "./attachment.types"

/** Validate, store, clean up, and authorize private message attachments.
 *
 * @layer Service
 */
export class AttachmentService implements MessageAttachmentPort {
    /** Inject persistence, private storage, and cleanup failure logging. */
    constructor(private readonly dependencies: AttachmentServiceDependencies) {}

    /** Validate a complete file batch before storing any object.
     *
     * @param input - Authenticated uploader and parsed file bytes.
     * @returns Safe file metadata with internal R2 keys for message persistence.
     * @throws {ValidationException} When the batch or any file is invalid.
     */
    async store(input: StoreAttachmentsInput): Promise<readonly StoredAttachment[]> {
        if (input.files.length > ATTACHMENT_LIMITS.MAX_FILE_COUNT) {
            throw new ValidationException(ATTACHMENT_ERROR_MESSAGES.TOO_MANY_FILES)
        }
        const metadata = await Promise.all(input.files.map((file) => this.validateFile(file)))
        const stored: StoredAttachment[] = []
        try {
            for (const [index, file] of input.files.entries()) {
                const key = `${ATTACHMENT_STORAGE.KEY_PREFIX}/${input.userId.toString()}/${randomUUID()}`
                const details = metadata[index]
                if (!details) throw new Error(ATTACHMENT_ERROR_MESSAGES.VALIDATED_METADATA_MISSING)
                await this.dependencies.storage.upload({ key, body: file.buffer, contentType: details.contentType })
                stored.push({ id: `${ATTACHMENT_STORAGE.ID_PREFIX}${key}`, ...details })
            }
            return stored
        } catch (error) {
            await this.cleanup(stored)
            throw error
        }
    }

    /** Attempt to remove every private object after a failed storage or database operation. */
    async cleanup(attachments: readonly StoredAttachment[]): Promise<void> {
        for (const attachment of attachments) {
            const key = attachment.id.slice(ATTACHMENT_STORAGE.ID_PREFIX.length)
            try {
                await this.dependencies.storage.delete(key)
            } catch (error) {
                this.dependencies.cleanupFailureRecorder.record(error)
            }
        }
    }

    /** Stream an attachment only when its message is visible to the current member. */
    async download(input: DownloadAttachmentInput): Promise<AttachmentStream> {
        const context = await this.dependencies.repository.findDownloadContext(input)
        if (
            !context ||
            !context.joinedAt ||
            context.messageCreatedAt < context.joinedAt ||
            !isMessageAttachmentMimeType(context.contentType)
        ) {
            throw new NotFoundException(ATTACHMENT_ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.ATTACHMENT_NOT_FOUND)
        }

        try {
            const object = await this.dependencies.storage.download(context.objectKey)
            return {
                body: object.body,
                name: sanitizeAttachmentFilename(context.name),
                contentType: context.contentType,
                size: context.size,
            }
        } catch (error) {
            if (isStorageNotFound(error)) {
                throw new NotFoundException(ATTACHMENT_ERROR_MESSAGES.NOT_FOUND, ERROR_CODES.ATTACHMENT_NOT_FOUND)
            }
            throw error
        }
    }

    private async validateFile(file: StoreAttachmentsInput["files"][number]): Promise<{
        readonly name: string
        readonly contentType: string
        readonly size: number
    }> {
        try {
            return await validateMessageFile(file)
        } catch (error) {
            if (error instanceof InvalidMessageAttachmentError) throw new ValidationException(error.message)
            throw error
        }
    }
}

function isStorageNotFound(error: unknown): boolean {
    if (typeof error !== "object" || error === null || !("$metadata" in error)) return false
    const metadata = error.$metadata
    return typeof metadata === "object" && metadata !== null && "httpStatusCode" in metadata
        && metadata.httpStatusCode === HttpStatusCode.NOT_FOUND
}

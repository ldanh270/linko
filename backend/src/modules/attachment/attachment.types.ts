import type { Types } from "mongoose"

/** MongoDB ObjectId used by attachment persistence and service boundaries. */
export type ObjectId = Types.ObjectId

/** File bytes and metadata accepted after multipart parsing. */
export interface AttachmentFile {
    readonly originalname: string
    readonly mimetype: string
    readonly buffer: Buffer
    readonly size: number
}

/** Private attachment object metadata stored on a message. */
export interface StoredAttachment {
    readonly id: string
    readonly name: string
    readonly contentType: string
    readonly size: number
}

/** Persisted attachment subdocument fields needed by message DTO mapping. */
export interface MessageAttachmentRecord {
    readonly subdocumentId: ObjectId
    readonly id: string
    readonly url: string | null
    readonly name: string | null
    readonly contentType: string | null
    readonly size: number | null
}

/** Message and membership timestamps required to enforce file download visibility. */
export interface AttachmentDownloadContext {
    readonly objectKey: string
    readonly messageCreatedAt: Date
    readonly joinedAt: Date | null
    readonly name: string
    readonly contentType: string
    readonly size: number
}

/** One private object response, without any bucket or key information. */
export interface PrivateAttachmentObject {
    readonly body: NodeJS.ReadableStream
}

/** Stream response safe for the authenticated download controller. */
export interface AttachmentStream extends PrivateAttachmentObject {
    readonly name: string
    readonly contentType: string
    readonly size: number
}

/** User and file data needed to validate and store a batch of attachments. */
export interface StoreAttachmentsInput {
    readonly userId: ObjectId
    readonly files: readonly AttachmentFile[]
}

/** IDs used to resolve one protected attachment download. */
export interface DownloadAttachmentInput {
    readonly messageId: ObjectId
    readonly attachmentId: ObjectId
    readonly userId: ObjectId
}

/** Persistence reads required for attachment download authorization. */
export interface AttachmentRepository {
    /** Load an attachment, its parent message time, and the caller's current join time. */
    findDownloadContext(input: DownloadAttachmentInput): Promise<AttachmentDownloadContext | null>
}

/** Port for storing, deleting, and streaming objects from private storage. */
export interface PrivateAttachmentStorage {
    /** Upload validated file bytes under a private object key. */
    upload(input: { readonly key: string; readonly body: Buffer; readonly contentType: string }): Promise<void>
    /** Delete one private object by its internal key. */
    delete(key: string): Promise<void>
    /** Stream one private object by its internal key. */
    download(key: string): Promise<PrivateAttachmentObject>
}

/** Record secondary cleanup failures without replacing the triggering error. */
export interface AttachmentCleanupFailureRecorder {
    /** Log one failure while withholding the object key and file content. */
    record(error: unknown): void
}

/** Dependencies injected into attachment business rules. */
export interface AttachmentServiceDependencies {
    readonly repository: AttachmentRepository
    readonly storage: PrivateAttachmentStorage
    readonly cleanupFailureRecorder: AttachmentCleanupFailureRecorder
}

/** Attachment operations injected into message persistence orchestration. */
export interface MessageAttachmentPort {
    /** Validate files and store them in private object storage. */
    store(input: StoreAttachmentsInput): Promise<readonly StoredAttachment[]>
    /** Best-effort deletion for objects whose message transaction failed. */
    cleanup(attachments: readonly StoredAttachment[]): Promise<void>
}

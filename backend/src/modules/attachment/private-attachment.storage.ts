import { deleteR2Object, getPrivateR2Object, putR2Object } from "../../services/r2Storage.service"
import { ATTACHMENT_STORAGE } from "./attachment.constants"
import type { PrivateAttachmentObject, PrivateAttachmentStorage } from "./attachment.types"

/** Adapt private R2 operations to the attachment storage port.
 *
 * @pattern Adapter
 * @layer Strategy
 */
export class R2PrivateAttachmentStorage implements PrivateAttachmentStorage {
    /** Write one validated attachment to the configured private bucket. */
    async upload(input: { readonly key: string; readonly body: Buffer; readonly contentType: string }): Promise<void> {
        await putR2Object({ bucket: ATTACHMENT_STORAGE.PRIVATE_BUCKET, ...input })
    }

    /** Delete one private object by its internal key. */
    async delete(key: string): Promise<void> {
        await deleteR2Object({ bucket: ATTACHMENT_STORAGE.PRIVATE_BUCKET, key })
    }

    /** Return a private object stream without exposing its key to the caller. */
    async download(key: string): Promise<PrivateAttachmentObject> {
        return getPrivateR2Object(key)
    }
}

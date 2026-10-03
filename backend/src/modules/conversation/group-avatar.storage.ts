import { GROUP_FIELDS } from "@linko/contracts"

import { ValidationException } from "../../shared/errors/ValidationException"
import { deleteStoredProfileImage, InvalidProfileImageError, storeProfileImage } from "../../utils/image.util"
import { GROUP_MESSAGES } from "./conversation.constants"
import type { GroupAvatarFile, GroupAvatarRecord, GroupAvatarStorage, ObjectId } from "./conversation.types"

/** Adapt the existing public R2 image pipeline to group avatar persistence.
 *
 * The shared image pipeline sniffs and normalizes image bytes before uploading them to the public bucket.
 *
 * @pattern Adapter
 * @layer Strategy
 */
export class R2GroupAvatarStorage implements GroupAvatarStorage {
    /** Upload an owner-scoped public avatar after validating its actual image bytes. */
    async upload(ownerId: ObjectId, file: GroupAvatarFile): Promise<GroupAvatarRecord> {
        try {
            return await storeProfileImage({
                userId: ownerId.toString(),
                field: GROUP_FIELDS.AVATAR,
                file,
            })
        } catch (error) {
            if (error instanceof InvalidProfileImageError) {
                throw new ValidationException(GROUP_MESSAGES.INVALID_AVATAR)
            }
            throw error
        }
    }

    /** Delete an R2 object created by the shared public image pipeline. */
    async delete(avatar: GroupAvatarRecord): Promise<void> {
        await deleteStoredProfileImage(avatar)
    }
}

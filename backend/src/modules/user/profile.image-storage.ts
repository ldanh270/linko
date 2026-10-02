import { ValidationException } from "../../shared/errors/ValidationException"
import { deleteStoredProfileImage, InvalidProfileImageError, storeProfileImage } from "../../utils/image.util"
import { PROFILE_MESSAGES } from "./profile.constants"
import type { ObjectId, ProfileImageField, ProfileImageFile, ProfileImageRecord, ProfileImageStorage } from "./profile.types"

/** Adapt public profile media operations to the existing validated R2 image pipeline.
 *
 * @pattern Adapter
 * @layer Strategy
 */
export class R2ProfileImageStorage implements ProfileImageStorage {
    /** Validate image bytes and upload them into the selected public profile media slot. */
    async upload(userId: ObjectId, field: ProfileImageField, file: ProfileImageFile): Promise<ProfileImageRecord> {
        try {
            return await storeProfileImage({ userId: userId.toString(), field, file })
        } catch (error) {
            if (error instanceof InvalidProfileImageError) {
                throw new ValidationException(PROFILE_MESSAGES.INVALID_IMAGE)
            }
            throw error
        }
    }

    /** Delete one replaced or compensating public profile image. */
    async delete(image: ProfileImageRecord): Promise<void> {
        await deleteStoredProfileImage(image)
    }
}

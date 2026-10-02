import { ERROR_CODES, type ProfileDto, type PublicUserDto } from "@linko/contracts"

import { MAX_UPLOAD_FILE_SIZE_BYTES, isProfileImageMimeType, normalizeUploadMimeType } from "../../configs/uploadPolicy.config"
import { ConflictException } from "../../shared/errors/ConflictException"
import { NotFoundException } from "../../shared/errors/NotFoundException"
import { ValidationException } from "../../shared/errors/ValidationException"
import { PROFILE_FIELDS, PROFILE_IMAGE_FIELDS, PROFILE_MESSAGES } from "./profile.constants"
import { toProfileDto, toPublicUserDto } from "./profile.mapper"
import type {
    ObjectId,
    ProfileImageField,
    ProfileImageRecord,
    ProfileRecord,
    ProfileServiceDependencies,
    UpdateProfileInput,
    UpdateProfileRecord,
} from "./profile.types"

type MutableProfileChanges = { -readonly [Field in keyof UpdateProfileRecord]?: UpdateProfileRecord[Field] }

/** Enforce profile privacy, uniqueness, validation, and media replacement rules.
 *
 * The repository owns MongoDB access; image storage is injected so uploads can be compensated
 * when persistence fails and replaced objects are removed only after a successful profile write.
 *
 * @layer Service
 */
export class ProfileService {
    /** Bind profile persistence, image storage, and cleanup recording collaborators. */
    constructor(private readonly dependencies: ProfileServiceDependencies) {}

    /** Return private account fields for the authenticated profile owner. */
    async getMine(userId: ObjectId): Promise<ProfileDto> {
        return toProfileDto(await this.requireProfile(userId))
    }

    /** Return only profile fields safe for another signed-in user to see. */
    async getPublic(userId: ObjectId): Promise<PublicUserDto> {
        const profile = await this.dependencies.repository.findPublicById(userId)
        if (!profile) throw new NotFoundException(PROFILE_MESSAGES.NOT_FOUND)
        return toPublicUserDto(profile)
    }

    /** Apply validated profile fields and replace public images after persistence succeeds. */
    async updateMine(input: UpdateProfileInput): Promise<ProfileDto> {
        const current = await this.requireProfile(input[PROFILE_FIELDS.USER_ID])
        const changes = this.createTextChanges(input, current)
        await this.assertUniqueFields(current, changes)
        this.assertHasChanges(input, changes)

        const uploadedImages: ProfileImageRecord[] = []
        const replacedImages: ProfileImageRecord[] = []
        let committedProfile: ProfileRecord

        try {
            await this.applyImageChange(input, PROFILE_IMAGE_FIELDS.AVATAR, current, changes, uploadedImages, replacedImages)
            await this.applyImageChange(input, PROFILE_IMAGE_FIELDS.BACKGROUND, current, changes, uploadedImages, replacedImages)
            const updated = await this.dependencies.repository.update(input[PROFILE_FIELDS.USER_ID], changes)
            if (!updated) throw new NotFoundException(PROFILE_MESSAGES.NOT_FOUND)
            committedProfile = updated
        } catch (error) {
            await this.compensateUploadedImages(uploadedImages, input[PROFILE_FIELDS.USER_ID])
            throw error
        }

        await this.removeReplacedImages(replacedImages, input[PROFILE_FIELDS.USER_ID])
        return toProfileDto(committedProfile)
    }

    private async requireProfile(userId: ObjectId): Promise<ProfileRecord> {
        const profile = await this.dependencies.repository.findById(userId)
        if (!profile) throw new NotFoundException(PROFILE_MESSAGES.NOT_FOUND)
        return profile
    }

    private createTextChanges(input: UpdateProfileInput, current: ProfileRecord): MutableProfileChanges {
        const changes: {
            username?: string
            displayName?: string
            email?: string
            phone?: string | null
            bio?: string | null
        } = {}
        if (input[PROFILE_FIELDS.USERNAME] !== undefined) {
            const username = input[PROFILE_FIELDS.USERNAME]
            if (username !== undefined) changes.username = username.trim().toLowerCase()
        }
        if (input[PROFILE_FIELDS.DISPLAY_NAME] !== undefined) {
            const displayName = input[PROFILE_FIELDS.DISPLAY_NAME]
            if (displayName !== undefined) changes.displayName = displayName.trim()
        }
        if (input[PROFILE_FIELDS.EMAIL] !== undefined) {
            const email = input[PROFILE_FIELDS.EMAIL]
            if (email !== undefined) changes.email = email.trim().toLowerCase()
        }
        if (input[PROFILE_FIELDS.PHONE] !== undefined) {
            changes.phone = input[PROFILE_FIELDS.PHONE]?.trim() || null
        }
        if (input[PROFILE_FIELDS.BIO] !== undefined) {
            changes.bio = input[PROFILE_FIELDS.BIO]?.trim() || null
        }
        if (changes.username === current[PROFILE_FIELDS.USERNAME]) delete changes.username
        if (changes.displayName === current[PROFILE_FIELDS.DISPLAY_NAME]) delete changes.displayName
        if (changes.email === current[PROFILE_FIELDS.EMAIL]) delete changes.email
        if (changes.phone === current[PROFILE_FIELDS.PHONE]) delete changes.phone
        if (changes.bio === current[PROFILE_FIELDS.BIO]) delete changes.bio
        return changes
    }

    private async assertUniqueFields(current: ProfileRecord, changes: UpdateProfileRecord): Promise<void> {
        if (changes.email && await this.hasEmailConflict(changes.email, current.id)) {
            throw new ConflictException(ERROR_CODES.EMAIL_TAKEN, PROFILE_MESSAGES.EMAIL_TAKEN)
        }
        if (changes.username && await this.hasUsernameConflict(changes.username, current.id)) {
            throw new ConflictException(ERROR_CODES.USERNAME_TAKEN, PROFILE_MESSAGES.USERNAME_TAKEN)
        }
    }

    private async hasEmailConflict(email: string, userId: ObjectId): Promise<boolean> {
        return this.dependencies.repository.findByEmail(email, userId)
    }

    private async hasUsernameConflict(username: string, userId: ObjectId): Promise<boolean> {
        return this.dependencies.repository.findByUsername(username, userId)
    }

    private assertHasChanges(input: UpdateProfileInput, changes: UpdateProfileRecord): void {
        const hasMediaChange = Boolean(input[PROFILE_IMAGE_FIELDS.AVATAR]
            || input[PROFILE_IMAGE_FIELDS.BACKGROUND]
            || input[PROFILE_FIELDS.REMOVE_AVATAR]
            || input[PROFILE_FIELDS.REMOVE_BACKGROUND])
        if (Object.keys(changes).length === 0 && !hasMediaChange) {
            throw new ValidationException(PROFILE_MESSAGES.EMPTY_UPDATE)
        }
    }

    private async applyImageChange(
        input: UpdateProfileInput,
        field: ProfileImageField,
        current: ProfileRecord,
        changes: MutableProfileChanges,
        uploadedImages: ProfileImageRecord[],
        replacedImages: ProfileImageRecord[],
    ): Promise<void> {
        const file = input[field]
        const removeImage = field === PROFILE_IMAGE_FIELDS.AVATAR ? input[PROFILE_FIELDS.REMOVE_AVATAR] : input[PROFILE_FIELDS.REMOVE_BACKGROUND]
        const previousImage = current[field]
        if (file) {
            this.validateImage(file)
            const image = await this.dependencies.imageStorage.upload(input[PROFILE_FIELDS.USER_ID], field, file)
            uploadedImages.push(image)
            changes[field] = image
            if (previousImage) replacedImages.push(previousImage)
            return
        }
        if (removeImage && previousImage) {
            changes[field] = null
            replacedImages.push(previousImage)
        }
    }

    private validateImage(file: UpdateProfileInput[ProfileImageField]): void {
        if (!file) return
        const mimeType = normalizeUploadMimeType(file.mimetype)
        if (!isProfileImageMimeType(mimeType) || file.buffer.byteLength > MAX_UPLOAD_FILE_SIZE_BYTES) {
            throw new ValidationException(PROFILE_MESSAGES.INVALID_IMAGE)
        }
    }

    private async compensateUploadedImages(images: readonly ProfileImageRecord[], userId: ObjectId): Promise<void> {
        for (const image of images) {
            try {
                await this.dependencies.imageStorage.delete(image)
            } catch (error) {
                this.dependencies.cleanupFailureRecorder.recordFailure(image, userId, error)
            }
        }
    }

    private async removeReplacedImages(images: readonly ProfileImageRecord[], userId: ObjectId): Promise<void> {
        for (const image of images) {
            try {
                await this.dependencies.imageStorage.delete(image)
            } catch (error) {
                this.dependencies.cleanupFailureRecorder.recordFailure(image, userId, error)
            }
        }
    }
}

import { ERROR_CODES } from "@linko/contracts"
import type { HydratedDocument } from "mongoose"

import User, { type UserType } from "../../models/User"
import { ConflictException } from "../../shared/errors/ConflictException"
import { PROFILE_DATABASE_CODES, PROFILE_FIELDS, PROFILE_MESSAGES } from "./profile.constants"
import type {
    ObjectId,
    ProfileRecord,
    ProfileRepository,
    PublicProfileRecord,
    UpdateProfileRecord,
} from "./profile.types"

/** Isolate user-profile persistence and translate known unique-index races.
 *
 * Select clauses explicitly exclude password and audit fields from profile records.
 *
 * @pattern Repository
 * @layer Repository
 */
export class MongooseProfileRepository implements ProfileRepository {
    /** Find the active account owner's private profile fields. */
    async findById(userId: ObjectId): Promise<ProfileRecord | null> {
        const user = await User.findById(userId).select(this.privateProjection()).exec()
        return user ? this.toProfileRecord(user) : null
    }

    /** Find only public profile fields for another active account. */
    async findPublicById(userId: ObjectId): Promise<PublicProfileRecord | null> {
        const user = await User.findById(userId).select(this.publicProjection()).exec()
        return user ? this.toPublicProfileRecord(user) : null
    }

    /** Check whether a different active account already owns the normalized email. */
    async findByEmail(email: string, excludingUserId: ObjectId): Promise<boolean> {
        return Boolean(await User.findOne({
            [PROFILE_FIELDS.EMAIL]: email,
            [PROFILE_FIELDS.ID]: { $ne: excludingUserId },
        }).select({ [PROFILE_FIELDS.ID]: 1 }).exec())
    }

    /** Check whether a different active account already owns the normalized username. */
    async findByUsername(username: string, excludingUserId: ObjectId): Promise<boolean> {
        return Boolean(await User.findOne({
            [PROFILE_FIELDS.USERNAME]: username,
            [PROFILE_FIELDS.ID]: { $ne: excludingUserId },
        }).select({ [PROFILE_FIELDS.ID]: 1 }).exec())
    }

    /** Persist a whitelisted profile update and translate unique email or username races. */
    async update(userId: ObjectId, changes: UpdateProfileRecord): Promise<ProfileRecord | null> {
        try {
            const user = await User.findOneAndUpdate(
                { [PROFILE_FIELDS.ID]: userId },
                { $set: changes },
                { returnDocument: "after", runValidators: true },
            ).select(this.privateProjection()).exec()
            return user ? this.toProfileRecord(user) : null
        } catch (error) {
            const conflict = this.toUniqueProfileConflict(error)
            if (conflict) throw conflict
            throw error
        }
    }

    private privateProjection(): Record<string, 1> {
        return {
            [PROFILE_FIELDS.ID]: 1,
            [PROFILE_FIELDS.USERNAME]: 1,
            [PROFILE_FIELDS.DISPLAY_NAME]: 1,
            [PROFILE_FIELDS.EMAIL]: 1,
            [PROFILE_FIELDS.PHONE]: 1,
            [PROFILE_FIELDS.AVATAR]: 1,
            [PROFILE_FIELDS.BACKGROUND]: 1,
            [PROFILE_FIELDS.BIO]: 1,
            [PROFILE_FIELDS.CREATED_AT]: 1,
            [PROFILE_FIELDS.UPDATED_AT]: 1,
        }
    }

    private publicProjection(): Record<string, 1> {
        return {
            [PROFILE_FIELDS.ID]: 1,
            [PROFILE_FIELDS.USERNAME]: 1,
            [PROFILE_FIELDS.DISPLAY_NAME]: 1,
            [PROFILE_FIELDS.AVATAR]: 1,
            [PROFILE_FIELDS.BACKGROUND]: 1,
            [PROFILE_FIELDS.BIO]: 1,
        }
    }

    private toProfileRecord(user: HydratedDocument<UserType>): ProfileRecord {
        return {
            id: user._id,
            username: user[PROFILE_FIELDS.USERNAME],
            displayName: user[PROFILE_FIELDS.DISPLAY_NAME],
            email: user[PROFILE_FIELDS.EMAIL],
            phone: user[PROFILE_FIELDS.PHONE] ?? null,
            avatar: this.toImageRecord(user[PROFILE_FIELDS.AVATAR]),
            background: this.toImageRecord(user[PROFILE_FIELDS.BACKGROUND]),
            bio: user[PROFILE_FIELDS.BIO] ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }
    }

    private toPublicProfileRecord(user: HydratedDocument<UserType>): PublicProfileRecord {
        return {
            id: user._id,
            username: user[PROFILE_FIELDS.USERNAME],
            displayName: user[PROFILE_FIELDS.DISPLAY_NAME],
            avatar: this.toImageRecord(user[PROFILE_FIELDS.AVATAR]),
            background: this.toImageRecord(user[PROFILE_FIELDS.BACKGROUND]),
            bio: user[PROFILE_FIELDS.BIO] ?? null,
        }
    }

    private toImageRecord(image: UserType["avatar"] | UserType["background"] | null | undefined) {
        const url = image?.[PROFILE_FIELDS.URL]
        const id = image?.[PROFILE_FIELDS.MEDIA_ID]
        if (typeof url !== "string" || url.length === 0 || typeof id !== "string" || id.length === 0) return null
        return { url, id }
    }

    private toUniqueProfileConflict(error: unknown): ConflictException | null {
        if (!this.isDuplicateKeyError(error)) return null
        const keyPattern = error.keyPattern
        if (keyPattern && PROFILE_FIELDS.EMAIL in keyPattern) {
            return new ConflictException(ERROR_CODES.EMAIL_TAKEN, PROFILE_MESSAGES.EMAIL_TAKEN)
        }
        if (keyPattern && PROFILE_FIELDS.USERNAME in keyPattern) {
            return new ConflictException(ERROR_CODES.USERNAME_TAKEN, PROFILE_MESSAGES.USERNAME_TAKEN)
        }
        return null
    }

    private isDuplicateKeyError(error: unknown): error is {
        readonly code: number
        readonly keyPattern?: Record<string, unknown>
    } {
        return typeof error === "object" && error !== null
            && "code" in error
            && error.code === PROFILE_DATABASE_CODES.DUPLICATE_KEY
    }
}

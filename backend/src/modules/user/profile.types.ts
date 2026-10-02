import type { ProfileDto, PublicUserDto, UpdateProfileRequest } from "@linko/contracts"
import type { Types } from "mongoose"

import type { ProfileImageField } from "./profile.constants"

/** MongoDB ObjectId used by persistence-facing profile operations. */
export type ObjectId = Types.ObjectId

/** Public image metadata persisted on a user profile. */
export interface ProfileImageRecord {
    readonly url: string
    readonly id: string
}

/** In-memory upload accepted by the profile image storage port. */
export interface ProfileImageFile {
    readonly buffer: Buffer
    readonly mimetype: string
}

/** Persistence-independent fields used to render an account owner's profile. */
export interface ProfileRecord {
    readonly id: ObjectId
    readonly username: string
    readonly displayName: string
    readonly email: string
    readonly phone: string | null
    readonly avatar: ProfileImageRecord | null
    readonly background: ProfileImageRecord | null
    readonly bio: string | null
    readonly createdAt: Date
    readonly updatedAt: Date
}

/** Whitelisted fields a profile update can persist. */
export interface UpdateProfileRecord {
    readonly username?: string
    readonly displayName?: string
    readonly email?: string
    readonly phone?: string | null
    readonly avatar?: ProfileImageRecord | null
    readonly background?: ProfileImageRecord | null
    readonly bio?: string | null
}

/** Public subset loaded for another signed-in user's profile view. */
export type PublicProfileRecord = Pick<
    ProfileRecord,
    "id" | "username" | "displayName" | "avatar" | "background" | "bio"
>

/** Authenticated actor, editable profile fields, and optional image changes. */
export interface UpdateProfileInput extends UpdateProfileRequest {
    readonly userId: ObjectId
    readonly avatar?: ProfileImageFile
    readonly background?: ProfileImageFile
}

/** Persistence operations required by profile use cases. */
export interface ProfileRepository {
    /** Load the owner's active private profile fields. */
    findById(userId: ObjectId): Promise<ProfileRecord | null>
    /** Load only public fields for another active account. */
    findPublicById(userId: ObjectId): Promise<PublicProfileRecord | null>
    /** Check for another active account with the normalized email. */
    findByEmail(email: string, excludingUserId: ObjectId): Promise<boolean>
    /** Check for another active account with the normalized username. */
    findByUsername(username: string, excludingUserId: ObjectId): Promise<boolean>
    /** Persist the supplied whitelist and return the committed profile. */
    update(userId: ObjectId, changes: UpdateProfileRecord): Promise<ProfileRecord | null>
}

/** Upload or delete public profile media without exposing R2 to the service. */
export interface ProfileImageStorage {
    /** Validate image bytes and upload them to the correct public media slot. */
    upload(userId: ObjectId, field: ProfileImageField, file: ProfileImageFile): Promise<ProfileImageRecord>
    /** Delete one old or compensating public image. */
    delete(image: ProfileImageRecord): Promise<void>
}

/** Record a failed media deletion for later operational cleanup. */
export interface ProfileImageCleanupFailureRecorder {
    /** Record safe identifiers after a profile write or compensation cannot be cleaned up. */
    recordFailure(image: ProfileImageRecord, userId: ObjectId, error: unknown): void
}

/** Dependencies injected into profile business rules. */
export interface ProfileServiceDependencies {
    readonly repository: ProfileRepository
    readonly imageStorage: ProfileImageStorage
    readonly cleanupFailureRecorder: ProfileImageCleanupFailureRecorder
}

/** Profile DTOs shared with the API boundary. */
export type { ProfileDto, PublicUserDto, UpdateProfileRequest }

export type { ProfileImageField } from "./profile.constants"

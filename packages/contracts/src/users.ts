import type { EntityId } from "./envelope"

/** Private profile data returned only to the authenticated account owner. */
export interface ProfileDto {
    readonly id: EntityId
    readonly username: string
    readonly displayName: string
    readonly email: string
    readonly phone: string | null
    readonly avatarUrl: string | null
    readonly backgroundUrl: string | null
    readonly bio: string | null
}

/** Profile fields safe to show to another signed-in user. */
export interface PublicUserDto {
    readonly id: EntityId
    readonly username: string
    readonly displayName: string
    readonly avatarUrl: string | null
    readonly backgroundUrl: string | null
    readonly bio: string | null
}

/** Editable text fields accepted by the profile update endpoint. */
export interface UpdateProfileRequest {
    readonly username?: string
    readonly displayName?: string
    readonly email?: string
    readonly phone?: string | null
    readonly bio?: string | null
    readonly removeAvatar?: boolean
    readonly removeBackground?: boolean
}

import type { EntityId } from "./envelope"

/** User route parameter names shared by the profile API and frontend adapter. */
export const USER_ROUTE_PARAMS = {
    USER_ID: "userId",
} as const

/** User API suffixes shared by server route registration and client adapters. */
export const USER_ROUTE_PATHS = {
    ME: "/me",
    BY_ID: `/:${USER_ROUTE_PARAMS.USER_ID}`,
    SEARCH: "/search",
} as const

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

/** Editable text and image-removal fields accepted by profile updates. */
export interface UpdateProfileRequest {
    readonly username?: string
    readonly displayName?: string
    readonly email?: string
    readonly phone?: string | null
    readonly bio?: string | null
    readonly removeAvatar?: boolean
    readonly removeBackground?: boolean
}

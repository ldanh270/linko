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

/** Query parameter names accepted by the authenticated public people search. */
export const USER_SEARCH_QUERY_PARAMS = {
    KEYWORD: "keyword",
    TYPE: "type",
} as const

/** Search modes preserve the compact typing preview and full result list. */
export const USER_SEARCH_MODE = {
    TYPING: "TYPING",
    FULL: "FULL",
} as const

/** Search mode values accepted by the people search API. */
export type UserSearchMode = (typeof USER_SEARCH_MODE)[keyof typeof USER_SEARCH_MODE]

/** Runtime profile field names shared by DTOs, multipart forms, and persistence. */
export const USER_PROFILE_FIELDS = {
    ID: "id",
    USERNAME: "username",
    DISPLAY_NAME: "displayName",
    EMAIL: "email",
    PHONE: "phone",
    AVATAR: "avatar",
    BACKGROUND: "background",
    AVATAR_URL: "avatarUrl",
    BACKGROUND_URL: "backgroundUrl",
    BIO: "bio",
    REMOVE_AVATAR: "removeAvatar",
    REMOVE_BACKGROUND: "removeBackground",
} as const

/** Private profile data returned only to the authenticated account owner. */
export interface ProfileDto {
    readonly [USER_PROFILE_FIELDS.ID]: EntityId
    readonly [USER_PROFILE_FIELDS.USERNAME]: string
    readonly [USER_PROFILE_FIELDS.DISPLAY_NAME]: string
    readonly [USER_PROFILE_FIELDS.EMAIL]: string
    readonly [USER_PROFILE_FIELDS.PHONE]: string | null
    readonly [USER_PROFILE_FIELDS.AVATAR_URL]: string | null
    readonly [USER_PROFILE_FIELDS.BACKGROUND_URL]: string | null
    readonly [USER_PROFILE_FIELDS.BIO]: string | null
}

/** Profile fields safe to show to another signed-in user. */
export interface PublicUserDto {
    readonly [USER_PROFILE_FIELDS.ID]: EntityId
    readonly [USER_PROFILE_FIELDS.USERNAME]: string
    readonly [USER_PROFILE_FIELDS.DISPLAY_NAME]: string
    readonly [USER_PROFILE_FIELDS.AVATAR_URL]: string | null
    readonly [USER_PROFILE_FIELDS.BACKGROUND_URL]: string | null
    readonly [USER_PROFILE_FIELDS.BIO]: string | null
}

/** Editable text and image-removal fields accepted by profile updates. */
export interface UpdateProfileRequest {
    readonly [USER_PROFILE_FIELDS.USERNAME]?: string
    readonly [USER_PROFILE_FIELDS.DISPLAY_NAME]?: string
    readonly [USER_PROFILE_FIELDS.EMAIL]?: string
    readonly [USER_PROFILE_FIELDS.PHONE]?: string | null
    readonly [USER_PROFILE_FIELDS.BIO]?: string | null
    readonly [USER_PROFILE_FIELDS.REMOVE_AVATAR]?: boolean
    readonly [USER_PROFILE_FIELDS.REMOVE_BACKGROUND]?: boolean
}

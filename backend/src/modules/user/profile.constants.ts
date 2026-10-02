import { USER_ROUTE_PARAMS, USER_ROUTE_PATHS } from "@linko/contracts"

/** Profile database, DTO, and media field names shared within the user module. */
export const PROFILE_FIELDS = {
    ID: "_id",
    USER_ID: "userId",
    USERNAME: "username",
    DISPLAY_NAME: "displayName",
    EMAIL: "email",
    PHONE: "phone",
    AVATAR: "avatar",
    BACKGROUND: "background",
    BIO: "bio",
    URL: "url",
    MEDIA_ID: "id",
    CREATED_AT: "createdAt",
    UPDATED_AT: "updatedAt",
    REMOVE_AVATAR: "removeAvatar",
    REMOVE_BACKGROUND: "removeBackground",
    DTO_ID: "id",
    DTO_USERNAME: "username",
    DTO_DISPLAY_NAME: "displayName",
    DTO_EMAIL: "email",
    DTO_PHONE: "phone",
    DTO_AVATAR_URL: "avatarUrl",
    DTO_BACKGROUND_URL: "backgroundUrl",
    DTO_BIO: "bio",
} as const

/** Media slots supported by the profile image storage adapter. */
export const PROFILE_IMAGE_FIELDS = {
    AVATAR: PROFILE_FIELDS.AVATAR,
    BACKGROUND: PROFILE_FIELDS.BACKGROUND,
} as const

/** Exact multipart boolean values accepted by the profile upload form. */
export const PROFILE_FORM_VALUES = {
    TRUE: "true",
    FALSE: "false",
} as const

/** Validation patterns used at the profile HTTP boundary. */
export const PROFILE_PATTERNS = {
    OBJECT_ID: /^[a-f\d]{24}$/i,
} as const

/** Stable messages used for expected profile validation and lookup failures. */
export const PROFILE_MESSAGES = {
    NOT_FOUND: "User profile not found",
    EMAIL_TAKEN: "Email already in use",
    USERNAME_TAKEN: "Username already in use",
    INVALID_IMAGE: "Profile images must be JPEG, PNG, or WebP and 10 MiB or smaller",
    EMPTY_UPDATE: "At least one profile field must be changed",
} as const

/** Structured event names for retryable profile image cleanup failures. */
export const PROFILE_LOG_EVENTS = {
    IMAGE_CLEANUP_FAILED: "profile.image_cleanup_failed",
} as const

/** MongoDB duplicate-key value translated by the profile repository. */
export const PROFILE_DATABASE_CODES = {
    DUPLICATE_KEY: 11000,
} as const

/** Profile media slot accepted by the image storage port. */
export type ProfileImageField = (typeof PROFILE_IMAGE_FIELDS)[keyof typeof PROFILE_IMAGE_FIELDS]

export { USER_ROUTE_PARAMS as PROFILE_ROUTE_PARAMS, USER_ROUTE_PATHS as PROFILE_ROUTE_PATHS }

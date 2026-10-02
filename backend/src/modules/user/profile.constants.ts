
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

/** Stable messages used for expected profile validation and lookup failures. */
export const PROFILE_MESSAGES = {
    NOT_FOUND: "User profile not found",
    EMAIL_TAKEN: "Email already in use",
    USERNAME_TAKEN: "Username already in use",
    INVALID_IMAGE: "Profile images must be JPEG, PNG, or WebP and 10 MiB or smaller",
    EMPTY_UPDATE: "At least one profile field must be changed",
} as const

/** MongoDB duplicate-key value translated by the profile repository. */
export const PROFILE_DATABASE_CODES = {
    DUPLICATE_KEY: 11000,
} as const

/** Profile media slot accepted by the image storage port. */
export type ProfileImageField = (typeof PROFILE_IMAGE_FIELDS)[keyof typeof PROFILE_IMAGE_FIELDS]

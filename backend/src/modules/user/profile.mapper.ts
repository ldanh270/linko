import type { ProfileDto, PublicUserDto } from "@linko/contracts"

import { PROFILE_FIELDS } from "./profile.constants"
import type { ProfileRecord, PublicProfileRecord } from "./profile.types"

/** Map a persisted private profile to fields safe for its authenticated owner. */
export function toProfileDto(profile: ProfileRecord): ProfileDto {
    return {
        [PROFILE_FIELDS.DTO_ID]: profile.id.toString(),
        [PROFILE_FIELDS.DTO_USERNAME]: profile[PROFILE_FIELDS.USERNAME],
        [PROFILE_FIELDS.DTO_DISPLAY_NAME]: profile[PROFILE_FIELDS.DISPLAY_NAME],
        [PROFILE_FIELDS.DTO_EMAIL]: profile[PROFILE_FIELDS.EMAIL],
        [PROFILE_FIELDS.DTO_PHONE]: profile[PROFILE_FIELDS.PHONE],
        [PROFILE_FIELDS.DTO_AVATAR_URL]: profile[PROFILE_FIELDS.AVATAR]?.[PROFILE_FIELDS.URL] ?? null,
        [PROFILE_FIELDS.DTO_BACKGROUND_URL]: profile[PROFILE_FIELDS.BACKGROUND]?.[PROFILE_FIELDS.URL] ?? null,
        [PROFILE_FIELDS.DTO_BIO]: profile[PROFILE_FIELDS.BIO],
    }
}

/** Map a profile to the redacted fields visible to another signed-in user. */
export function toPublicUserDto(profile: PublicProfileRecord): PublicUserDto {
    return {
        [PROFILE_FIELDS.DTO_ID]: profile.id.toString(),
        [PROFILE_FIELDS.DTO_USERNAME]: profile[PROFILE_FIELDS.USERNAME],
        [PROFILE_FIELDS.DTO_DISPLAY_NAME]: profile[PROFILE_FIELDS.DISPLAY_NAME],
        [PROFILE_FIELDS.DTO_AVATAR_URL]: profile[PROFILE_FIELDS.AVATAR]?.[PROFILE_FIELDS.URL] ?? null,
        [PROFILE_FIELDS.DTO_BACKGROUND_URL]: profile[PROFILE_FIELDS.BACKGROUND]?.[PROFILE_FIELDS.URL] ?? null,
        [PROFILE_FIELDS.DTO_BIO]: profile[PROFILE_FIELDS.BIO],
    }
}

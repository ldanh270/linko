import {
    API_ROUTES,
    USER_PROFILE_FIELDS,
    USER_ROUTE_PARAMS,
    USER_ROUTE_PATHS,
    type ProfileDto,
    type PublicUserDto,
    type UpdateProfileRequest,
} from "@linko/contracts"

import { authenticatedApiClient } from "../../auth/api/auth.api"

/** Browser-only files accepted while updating a profile. */
export interface UpdateMineInput extends UpdateProfileRequest {
    readonly avatar?: File
    readonly background?: File
}

const PROFILE_ENDPOINT = API_ROUTES.USERS

/** Return the authenticated account's private profile DTO.
 *
 * @returns The private profile or a normalized `ApiError` from the shared client.
 */
export function getMine(): Promise<ProfileDto> {
    return authenticatedApiClient.request({ path: `${PROFILE_ENDPOINT}${USER_ROUTE_PATHS.ME}` })
}

/** Return one signed-in user's public profile DTO.
 *
 * @param userId - MongoDB ObjectId of the profile to read.
 * @returns The redacted public profile DTO.
 */
export function getPublicUser(userId: string): Promise<PublicUserDto> {
    const path = USER_ROUTE_PATHS.BY_ID.replace(`:${USER_ROUTE_PARAMS.USER_ID}`, userId)
    return authenticatedApiClient.request({ path: `${PROFILE_ENDPOINT}${path}` })
}

/** Update profile text and optional avatar/background files through the shared transport.
 *
 * @param input - Profile fields and optional browser image files.
 * @returns The persisted private profile DTO.
 */
export function updateMine(input: UpdateMineInput): Promise<ProfileDto> {
    return authenticatedApiClient.request({
        path: `${PROFILE_ENDPOINT}${USER_ROUTE_PATHS.ME}`,
        method: "PATCH",
        body: createProfileFormData(input),
    })
}

/** Encode only supplied profile fields while representing nullable values as empty form fields. */
function createProfileFormData(input: UpdateMineInput): FormData {
    const formData = new FormData()
    const fields: ReadonlyArray<readonly [string, string | null | undefined]> = [
        [USER_PROFILE_FIELDS.USERNAME, input.username],
        [USER_PROFILE_FIELDS.DISPLAY_NAME, input.displayName],
        [USER_PROFILE_FIELDS.EMAIL, input.email],
        [USER_PROFILE_FIELDS.PHONE, input.phone],
        [USER_PROFILE_FIELDS.BIO, input.bio],
    ]
    for (const [field, value] of fields) {
        if (value !== undefined) formData.append(field, value ?? "")
    }
    if (input.removeAvatar !== undefined) formData.append(USER_PROFILE_FIELDS.REMOVE_AVATAR, String(input.removeAvatar))
    if (input.removeBackground !== undefined) formData.append(USER_PROFILE_FIELDS.REMOVE_BACKGROUND, String(input.removeBackground))
    if (input.avatar) formData.append(USER_PROFILE_FIELDS.AVATAR, input.avatar)
    if (input.background) formData.append(USER_PROFILE_FIELDS.BACKGROUND, input.background)
    return formData
}

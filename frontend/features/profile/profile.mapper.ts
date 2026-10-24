import { USER_PROFILE_FIELDS, type ProfileDto } from "@linko/contracts"

const UNSET = "Chưa thiết lập"

/** Prepare real profile details and explicit unset states without inventing API fields. */
export function mapProfileDetails(profile: ProfileDto) {
  return [
    { label: "Tên", value: profile[USER_PROFILE_FIELDS.DISPLAY_NAME] },
    { label: "Email", value: profile[USER_PROFILE_FIELDS.EMAIL] },
    { label: "Số điện thoại", value: profile[USER_PROFILE_FIELDS.PHONE] || UNSET },
    { label: "Vị trí", value: UNSET },
  ] as const
}

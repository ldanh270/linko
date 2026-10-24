import { z } from "zod"
import { USER_PROFILE_FIELDS, USER_PROFILE_TEXT_LIMITS, USER_PROFILE_PATTERNS } from "@linko/contracts"

/** Browser form schema follows shared profile limits while adding localized feedback. */
export const PROFILE_FORM_SCHEMA = z.object({
  [USER_PROFILE_FIELDS.DISPLAY_NAME]: z.string().trim().min(1, "Nhập tên hiển thị.").max(USER_PROFILE_TEXT_LIMITS.MAX_DISPLAY_NAME),
  [USER_PROFILE_FIELDS.USERNAME]: z.string().min(USER_PROFILE_TEXT_LIMITS.MIN_USERNAME).max(USER_PROFILE_TEXT_LIMITS.MAX_USERNAME).regex(USER_PROFILE_PATTERNS.USERNAME, "Dùng chữ thường, số, dấu chấm hoặc gạch dưới."),
  [USER_PROFILE_FIELDS.EMAIL]: z.email("Email không hợp lệ."),
  [USER_PROFILE_FIELDS.BIO]: z.string().max(USER_PROFILE_TEXT_LIMITS.MAX_BIO),
})

/** Validated editable text values kept separate from browser-only image files. */
export type ProfileFormValues = z.infer<typeof PROFILE_FORM_SCHEMA>

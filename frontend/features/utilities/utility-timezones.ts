/** Readable choices retain IANA identifiers only as transport values. */
export const UTILITY_TIMEZONES = [
  { value: "Asia/Ho_Chi_Minh", label: "Việt Nam (UTC+07:00)" },
  { value: "Asia/Bangkok", label: "Thái Lan (UTC+07:00)" },
  { value: "Asia/Singapore", label: "Singapore (UTC+08:00)" },
  { value: "Asia/Tokyo", label: "Nhật Bản (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "UTC", label: "Giờ quốc tế (UTC)" },
] as const

/** Include a browser or saved timezone even when outside the common choices. */
export function getUtilityTimezoneOptions(timezone: string) {
  return UTILITY_TIMEZONES.some((option) => option.value === timezone) ? UTILITY_TIMEZONES : [{ value: timezone, label: `${timezone.replaceAll("_", " ")} (giờ thiết bị/lịch đã lưu)` }, ...UTILITY_TIMEZONES]
}

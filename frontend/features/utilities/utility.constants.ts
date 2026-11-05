/** Cache prefixes, URL controls and copy shared by utility hooks and components. */
export const UTILITY_UI = { QUERY: "chat-utilities", REMINDERS: "personal-reminders", PANEL: "utilities", FOCUS: "message", POLL: "poll", APPOINTMENT: "appointment", LOCATION: "location", INBOX: "reminders", OVERVIEW: "overview", NONE: "", ERROR: "Không thể hoàn tất thao tác. Hãy thử lại.", SUCCESS: "Đã lưu thay đổi.", MAP_TILE_URL: process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", MAP_ATTRIBUTION: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' } as const
/** Native form styling consistent with existing inputs. */
export const UTILITY_FIELD_CLASS = "min-h-11 w-full rounded-md border border-border bg-surface px-3 text-text-primary focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
/** Optional source message for creating an appointment from a conversation action. */
export const APPOINTMENT_SOURCE_PARAM = "appointmentMessage"

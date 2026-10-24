import { THEME_MODE } from "@/shared/theme/theme.constants"

/** URL identifiers for the reference settings accordion. */
export const SETTINGS_SECTIONS = { PERSONAL: "personal", PRIVACY: "privacy", SECURITY: "security", HELP: "help", APPEARANCE: "appearance" } as const
/** Existing theme choices retained under appearance. */
export const THEME_OPTIONS = [{ value: THEME_MODE.SYSTEM, label: "Theo thiết bị" }, { value: THEME_MODE.LIGHT, label: "Sáng" }, { value: THEME_MODE.DARK, label: "Tối" }] as const
/** Explain actual supported account behavior instead of adding nonfunctional switches. */
export const SETTINGS_EXPLANATIONS = [
  { id: SETTINGS_SECTIONS.PRIVACY, title: "Quyền riêng tư", description: "Chỉ thành viên có quyền truy cập mới xem được cuộc trò chuyện và tệp trong nhóm. Email và số điện thoại chỉ hiển thị trong hồ sơ tài khoản của bạn." },
  { id: SETTINGS_SECTIONS.SECURITY, title: "Bảo mật", description: "Phiên đăng nhập được bảo vệ trên thiết bị này. Đăng xuất để kết thúc phiên khi sử dụng thiết bị dùng chung." },
  { id: SETTINGS_SECTIONS.HELP, title: "Trợ giúp", description: "Mở Tin nhắn để bắt đầu trò chuyện; dùng Nhóm để tạo không gian riêng và Danh bạ để kết nối bạn bè. Các tính năng gọi thoại và gọi video hiện chưa khả dụng." },
] as const

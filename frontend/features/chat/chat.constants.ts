import { ERROR_CODES } from "@linko/contracts"

/** Access failures must not be treated as recoverable cached-history refetch errors. */
export const CHAT_ACCESS_ERRORS: ReadonlySet<string> = new Set([ERROR_CODES.UNAUTHORIZED, ERROR_CODES.FORBIDDEN, ERROR_CODES.NOT_FOUND, ERROR_CODES.GROUP_CLOSED, ERROR_CODES.INVALID_SESSION, ERROR_CODES.INVALID_TOKEN])

/** Conversation behavior values and copy reused by hooks and presentation. */
export const CHAT_KIND = { GROUP: "group", DIRECT: "direct" } as const
/** Chat query key groups centralize cache identity. */
export const CHAT_QUERY_KEYS = { MESSAGES: "messages", MEMBERS: "members", PREFERENCE: "group-preference" } as const
/** User-facing chat messages shared by timeline and composer. */
export const CHAT_COPY = {
  MEMBER: "Thành viên", PRIVATE: "Tin nhắn riêng", GROUP: "Nhóm riêng", SEND_ERROR: "Tin nhắn chưa gửi được. Hãy thử lại.",
  FILE_COUNT_ERROR: "Mỗi tin nhắn có thể đính kèm tối đa 5 tệp.", FILE_SIZE_ERROR: "Mỗi tệp có dung lượng tối đa 10 MiB.",
  FILE_TYPE_ERROR: "Định dạng tệp không được hỗ trợ. Vui lòng chọn ảnh (JPG, PNG, WebP, GIF) hoặc tài liệu (PDF, Word, Excel, CSV, TXT).",
  UNTITLED_FILE: "Tệp đính kèm", MESSAGE_ACTIONS: "Tùy chọn tin nhắn", REPLY: "Trả lời", PIN: "Ghim", UNPIN: "Bỏ ghim",
} as const

/** Allowed file extensions for attachments in messages. */
export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  ".jpg", ".jpeg", ".jfif", ".png", ".webp", ".gif",
  ".pdf", ".txt", ".csv", ".docx", ".xlsx", ".pptx",
] as const

/** Accept attribute value for browser file pickers. */
export const ATTACHMENT_ACCEPT_ATTRIBUTE =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.jfif,.png,.webp,.gif,.pdf,.txt,.csv,.docx,.xlsx,.pptx" as const

/** Details sheet accordion section keys. */
export const CHAT_DETAILS_SECTIONS = {
  INFO: "info",
  MEMBERS: "members",
  MEDIA: "media",
  PINS: "pins",
  PRIVACY: "privacy",
} as const

/** User-facing copy for the chat details sheet. */
export const CHAT_DETAILS_COPY = {
  SHEET_TITLE: "Thông tin về đoạn chat",
  CLOSE: "Đóng chi tiết",
  OPEN_DETAILS: "Chi tiết cuộc trò chuyện",
  SEARCH: "Tìm kiếm",
  MUTE: "Tắt thông báo",
  UNMUTE: "Bật thông báo",
  PROFILE: "Trang cá nhân",
  ADD_MEMBER: "Thêm người",
  MANAGE_GROUP: "Quản lý nhóm",
  INVITATIONS: "Mã lời mời",
  SECTION_INFO: "Thông tin đoạn chat",
  SECTION_MEMBERS: "Thành viên trong đoạn chat",
  SECTION_MEDIA: "File phương tiện & file",
  SECTION_PINS: "Tin nhắn đã ghim",
  SECTION_PRIVACY: "Quyền riêng tư & hỗ trợ",
  PHOTOS: "Ảnh",
  FILES: "File đính kèm",
  NO_MEDIA: "Chưa có file phương tiện nào.",
  NO_FILES: "Chưa có file nào được chia sẻ.",
  NO_PINS: "Chưa có tin nhắn nào được ghim.",
  LEAVE_GROUP: "Rời khỏi nhóm",
  LEAVE_CONFIRM: "Bạn có chắc chắn muốn rời nhóm này không? Bạn sẽ không thể xem lại các tin nhắn sau này trừ khi được mời lại.",
} as const

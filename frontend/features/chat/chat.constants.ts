import { ERROR_CODES } from "@linko/contracts"

/** Access failures must not be treated as recoverable cached-history refetch errors. */
export const CHAT_ACCESS_ERRORS: ReadonlySet<string> = new Set([ERROR_CODES.UNAUTHORIZED, ERROR_CODES.FORBIDDEN, ERROR_CODES.NOT_FOUND, ERROR_CODES.GROUP_CLOSED, ERROR_CODES.INVALID_SESSION, ERROR_CODES.INVALID_TOKEN])

/** Conversation behavior values and copy reused by hooks and presentation. */
export const CHAT_KIND = { GROUP: "group", DIRECT: "direct" } as const
/** Chat query key groups centralize cache identity. */
export const CHAT_QUERY_KEYS = { MESSAGES: "messages", MEMBERS: "members" } as const
/** User-facing chat messages shared by timeline and composer. */
export const CHAT_COPY = {
  MEMBER: "Thành viên", PRIVATE: "Tin nhắn riêng", GROUP: "Nhóm riêng", SEND_ERROR: "Tin nhắn chưa gửi được. Hãy thử lại.",
  FILE_COUNT_ERROR: "Mỗi tin nhắn có thể đính kèm tối đa 5 tệp.", FILE_SIZE_ERROR: "Mỗi tệp có dung lượng tối đa 10 MiB.",
  UNTITLED_FILE: "Tệp đính kèm", MESSAGE_ACTIONS: "Tùy chọn tin nhắn", REPLY: "Trả lời", PIN: "Ghim", UNPIN: "Bỏ ghim",
} as const

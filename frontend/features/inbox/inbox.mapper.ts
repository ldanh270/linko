import { CONVERSATION_TYPE, INBOX_FIELDS, type InboxItemDto } from "@linko/contracts"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import type { ConversationRowViewModel } from "./inbox.types"

/** Format the last message preview label based on whether it is an own reply, a group member, or an attachment. */
function formatPreview(item: InboxItemDto, currentUserId: string, isGroup: boolean): string {
  if (!item.lastMessage) return "Chưa có tin nhắn"

  const isOwn = Boolean(item.lastMessage.sender?.id && item.lastMessage.sender.id === currentUserId)
  const content = item.lastMessage.content?.trim()

  if (isOwn) {
    return content ? `Bạn: ${content}` : "Bạn đã gửi một tệp đính kèm"
  }

  if (isGroup) {
    const senderName = item.lastMessage.sender?.displayName ?? "Thành viên"
    return content ? `${senderName}: ${content}` : `${senderName} đã gửi một tệp đính kèm`
  }

  return content || "Đã gửi một tệp đính kèm"
}

/** Prepare the peer identity and route once for lists, strips and group rows. */
export function mapConversationRow(item: InboxItemDto, currentUserId: string): ConversationRowViewModel {
  const peer = item[INBOX_FIELDS.PARTICIPANTS].find((person) => person.id !== currentUserId)
  const isGroup = item.type === CONVERSATION_TYPE.GROUP
  const title = item.group?.name ?? peer?.displayName ?? "Cuộc trò chuyện"
  const timestamp = item.lastMessage?.createdAt ?? null
  return {
    id: item[INBOX_FIELDS.ID],
    peerId: isGroup ? null : (peer?.id ?? null),
    isGroup,
    title,
    avatarUrl: isGroup ? item.group?.avatarUrl ?? null : peer?.avatarUrl ?? null,
    href: buildAppRoute(isGroup ? APP_ROUTES.GROUP_CONVERSATION : APP_ROUTES.DIRECT_CONVERSATION, { conversationId: item.id }),
    preview: formatPreview(item, currentUserId, isGroup),
    unreadCount: item.unreadCount,
    timestamp,
    timeLabel: timestamp ? new Date(timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "",
    firstName: title.split(/\s+/).at(-1) ?? title,
  }
}

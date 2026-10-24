import { CONVERSATION_TYPE, INBOX_FIELDS, type InboxItemDto } from "@linko/contracts"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import type { ConversationRowViewModel } from "./inbox.types"

/** Prepare the peer identity and route once for lists, strips and group rows. */
export function mapConversationRow(item: InboxItemDto, currentUserId: string): ConversationRowViewModel {
  const peer = item[INBOX_FIELDS.PARTICIPANTS].find((person) => person.id !== currentUserId)
  const title = item.group?.name ?? peer?.displayName ?? "Cuộc trò chuyện"
  const timestamp = item.lastMessage?.createdAt ?? null
  return { id: item[INBOX_FIELDS.ID], title, avatarUrl: item.type === CONVERSATION_TYPE.GROUP ? item.group?.avatarUrl ?? null : peer?.avatarUrl ?? null,
    href: buildAppRoute(item.type === CONVERSATION_TYPE.GROUP ? APP_ROUTES.GROUP_CONVERSATION : APP_ROUTES.DIRECT_CONVERSATION, { conversationId: item.id }),
    preview: item.lastMessage?.content ?? "Chưa có tin nhắn", unreadCount: item.unreadCount, timestamp,
    timeLabel: timestamp ? new Date(timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "",
    firstName: title.split(/\s+/).at(-1) ?? title }
}

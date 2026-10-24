import { CONVERSATION_TYPE, INBOX_FIELDS, type InboxItemDto } from "@linko/contracts"
import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"

/** Properties for a list of navigable conversations. */
export interface ConversationListProps {
  items: readonly InboxItemDto[]
  activeConversationId?: string
}

/** Render conversation rows for the inbox and persistent chat sidebar. UI only. */
export function ConversationList({ items, activeConversationId }: ConversationListProps) {
  return <ul className="divide-y divide-[var(--border)]">
    {items.map((item) => <ConversationListRow key={item[INBOX_FIELDS.ID]} item={item} isActive={item.id === activeConversationId} />)}
  </ul>
}

function ConversationListRow({ item, isActive }: { readonly item: InboxItemDto; readonly isActive: boolean }) {
  const title = item.group?.name ?? item.participants[0]?.displayName ?? "Cuộc trò chuyện"
  const href = item.type === CONVERSATION_TYPE.GROUP
    ? buildAppRoute(APP_ROUTES.GROUP_CONVERSATION, { conversationId: item.id })
    : buildAppRoute(APP_ROUTES.DIRECT_CONVERSATION, { conversationId: item.id })
  return <li>
    <Link href={href} aria-current={isActive ? "page" : undefined} className={`flex min-h-[4.75rem] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 ${isActive ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--surface-subtle)]"}`}>
      <Avatar label={title} size="small" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        <span className="mt-1 block truncate text-sm text-[var(--text-secondary)]">{item.lastMessage?.content ?? "Chưa có tin nhắn"}</span>
      </span>
      {item.unreadCount > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-[var(--brand)] px-2 text-xs font-bold text-[var(--brand-contrast)]" aria-label={`${item.unreadCount} tin chưa đọc`}>{item.unreadCount}</span>}
    </Link>
  </li>
}

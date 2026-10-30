import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import type { ConversationRowViewModel } from "../inbox.types"

/** Prepared list-row identity and selected state. */
export interface ConversationListRowProps {
  readonly row: ConversationRowViewModel
  readonly isActive: boolean
  readonly isOnline?: boolean
}

/** Render one compact conversation with timestamp, presence status and actual unread count. UI only. */
export function ConversationListRow({ row, isActive, isOnline }: ConversationListRowProps) {
  return (
    <li>
      <Link href={row.href} aria-current={isActive ? "page" : undefined} className="conversation-row">
        <Avatar label={row.title} src={row.avatarUrl} size="small" isOnline={isOnline} />
        <span className="conversation-row-main">
          <span className="conversation-row-heading">
            <strong>{row.title}</strong>
            {row.timestamp && <time dateTime={row.timestamp}>{row.timeLabel}</time>}
          </span>
          <span className="conversation-row-preview">
            <span className="truncate">{row.preview}</span>
            {row.unreadCount > 0 && (
              <span className="unread-badge" aria-label={`${row.unreadCount} tin chưa đọc`}>
                {row.unreadCount}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

import { Avatar } from "@/shared/components/Avatar"
import { Badge } from "@/shared/components/Badge"
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
      <Link
        href={row.href}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center min-h-[72px] gap-3 px-5 py-3 rounded-[var(--radius-md)] mb-0.5 transition-colors ${
          isActive
            ? "bg-[var(--input-surface)] text-[var(--text-primary)]"
            : "hover:bg-[var(--input-surface)] text-[var(--text-primary)]"
        }`}
      >
        <Avatar label={row.title} src={row.avatarUrl} size="small" isOnline={isOnline} />
        <span className="flex flex-col flex-1 min-w-0">
          <span className="flex items-center justify-between gap-2 leading-normal">
            <strong className="text-base font-semibold truncate text-[var(--text-primary)]">{row.title}</strong>
            {row.timestamp && (
              <time dateTime={row.timestamp} className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                {row.timeLabel}
              </time>
            )}
          </span>
          <span className="flex items-center justify-between mt-1 gap-2 text-sm text-[var(--text-secondary)]">
            <span className="truncate">{row.preview}</span>
            {row.unreadCount > 0 && (
              <Badge
                variant="danger"
                shape="pill"
                size="sm"
                aria-label={`${row.unreadCount} tin chưa đọc`}
              >
                {row.unreadCount}
              </Badge>
            )}
          </span>
        </span>
      </Link>
    </li>
  )
}

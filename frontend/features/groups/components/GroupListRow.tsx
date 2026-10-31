import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import type { ConversationRowViewModel } from "@/features/inbox/inbox.types"

/** Prepared group summary for a compact sidebar row. */
export interface GroupListRowProps { readonly group: ConversationRowViewModel }

/** Render the reference initial-avatar group row with a real unread badge. UI only. */
export function GroupListRow({ group }: GroupListRowProps) {
  return (
    <li>
      <Link
        href={group.href}
        className="flex items-center gap-4 min-h-[64px] px-6 py-3 text-base rounded-[var(--radius-md)] mb-0.5 transition-colors hover:bg-[var(--input-surface)] text-[var(--text-primary)]"
      >
        <Avatar label={group.title} src={group.avatarUrl} size="small" />
        <span className="flex-1 min-w-0 truncate font-medium">#{group.title}</span>
        {group.unreadCount > 0 && (
          <span className="inline-grid place-items-center bg-[var(--badge-background)] text-[var(--badge-text)] text-[10px] font-bold min-w-5 min-h-5 px-1.5 rounded-full">
            +{group.unreadCount}
          </span>
        )}
      </Link>
    </li>
  )
}

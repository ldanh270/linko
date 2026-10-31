import { Avatar } from "@/shared/components/Avatar"
import { Badge } from "@/shared/components/Badge"
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
        className="flex items-center gap-3.5 min-h-16 px-3 py-3 text-base rounded-md mb-0.5 transition-colors hover:bg-input-surface text-text-primary"
      >
        <Avatar label={group.title} src={group.avatarUrl} size="small" />
        <span className="flex-1 min-w-0 truncate font-medium">#{group.title}</span>
        {group.unreadCount > 0 && (
          <Badge variant="danger" shape="pill" size="sm">
            +{group.unreadCount}
          </Badge>
        )}
      </Link>
    </li>
  )
}

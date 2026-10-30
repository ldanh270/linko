import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import type { ConversationRowViewModel } from "@/features/inbox/inbox.types"

/** Prepared group summary for a compact sidebar row. */
export interface GroupListRowProps { readonly group: ConversationRowViewModel }

/** Render the reference initial-avatar group row with a real unread badge. UI only. */
export function GroupListRow({ group }: GroupListRowProps) {
  return <li><Link href={group.href} className="group-row"><Avatar label={group.title} src={group.avatarUrl} size="small" /><span className="group-row-name">#{group.title}</span>{group.unreadCount > 0 && <span className="unread-badge">+{group.unreadCount}</span>}</Link></li>
}

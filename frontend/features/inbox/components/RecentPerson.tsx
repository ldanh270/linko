import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import type { ConversationRowViewModel } from "../inbox.types"

/** Compact identity shortcut props. */
export interface RecentPersonProps {
  readonly person: ConversationRowViewModel
  readonly isOnline?: boolean
}

/** Render a recent conversation shortcut with online presence status. UI only. */
export function RecentPerson({ person, isOnline }: RecentPersonProps) {
  return (
    <Link href={person.href} className="recent-person" title={person.title}>
      <Avatar label={person.title} src={person.avatarUrl} size="small" isOnline={isOnline} />
      <span>{person.firstName}</span>
    </Link>
  )
}

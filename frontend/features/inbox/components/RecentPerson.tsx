import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import type { ConversationRowViewModel } from "../inbox.types"

/** Compact identity shortcut props. */
export interface RecentPersonProps { readonly person: ConversationRowViewModel }

/** Render a recent conversation shortcut without asserting unsupported online presence. UI only. */
export function RecentPerson({ person }: RecentPersonProps) {
  return <Link href={person.href} className="recent-person" title={person.title}><Avatar label={person.title} src={person.avatarUrl} size="small" /><span>{person.firstName}</span></Link>
}

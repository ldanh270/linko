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
    <Link
      href={person.href}
      title={person.title}
      className="group flex flex-col items-center justify-center w-[76px] min-w-[76px] p-2 py-3 gap-2 rounded-[var(--radius-lg)] bg-[var(--input-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] transition-all hover:bg-[var(--input-surface-hover)] hover:border-[var(--border)] hover:-translate-y-0.5 [&_.avatar-status-badge]:border-[var(--input-surface)] group-hover:[&_.avatar-status-badge]:border-[var(--input-surface-hover)]"
    >
      <Avatar label={person.title} src={person.avatarUrl} size="small" isOnline={isOnline} />
      <span className="max-w-[64px] truncate text-center text-xs font-medium leading-tight text-[var(--text-primary)]">
        {person.firstName}
      </span>
    </Link>
  )
}

"use client"

import { Avatar } from "@/shared/components/Avatar"
import { useI18n } from "@/shared/i18n/useI18n"
import type { FriendDto } from "@linko/contracts"

export interface InboxSearchContactRowProps {
  readonly person: FriendDto
  readonly isOnline?: boolean
  readonly isLoading?: boolean
  readonly onSelect: (person: FriendDto) => void
}

/** Render one public contact match in the Messenger-style search list. UI only. */
export function InboxSearchContactRow({
  person,
  isOnline,
  isLoading,
  onSelect,
}: InboxSearchContactRowProps) {
  const { copy } = useI18n()
  const displayName = person.displayName || person.username

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(person)}
        disabled={isLoading}
        className="w-full flex items-center min-h-[64px] gap-3 px-5 py-2.5 rounded-md mb-0.5 text-left transition-colors hover:bg-input-surface cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
      >
        <Avatar label={displayName} src={person.avatarUrl} size="small" isOnline={isOnline} />
        <span className="flex flex-col flex-1 min-w-0">
          <span className="flex items-center justify-between gap-2">
            <strong className="text-sm font-semibold truncate text-text-primary">
              {displayName}
            </strong>
            {isLoading ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-r-transparent"
              />
            ) : (
              <span className="opacity-0 group-hover:opacity-100 text-xs text-brand font-medium transition-opacity">
                {copy.inbox.sendDirectMessage}
              </span>
            )}
          </span>
          <span className="text-xs text-text-secondary truncate">
            @{person.username}
          </span>
        </span>
      </button>
    </li>
  )
}

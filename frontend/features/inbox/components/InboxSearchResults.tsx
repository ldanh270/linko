"use client"

import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { ConversationListRow } from "./ConversationListRow"
import { InboxSearchContactRow } from "./InboxSearchContactRow"
import type { ConversationRowViewModel } from "../inbox.types"
import type { FriendDto } from "@linko/contracts"

export interface InboxSearchResultsProps {
  readonly search: string
  readonly recentConversations: readonly ConversationRowViewModel[]
  readonly matchingConversations: readonly ConversationRowViewModel[]
  readonly matchingPeople: readonly FriendDto[]
  readonly isSearchingPeople: boolean
  readonly activeConversationId?: string
  readonly isOnline: (peerId?: string | null) => boolean
  readonly openingPersonId: string | null
  readonly onSelectPerson: (person: FriendDto) => void
}

/**
 * Messenger-style search results overlaying the sidebar.
 * Displays matching conversations, contacts, or recent quick-chats when query is blank. UI only.
 */
export function InboxSearchResults({
  search,
  recentConversations,
  matchingConversations,
  matchingPeople,
  isSearchingPeople,
  activeConversationId,
  isOnline,
  openingPersonId,
  onSelectPerson,
}: InboxSearchResultsProps) {
  const trimmed = search.trim()

  // 1. When search bar is focused but no query typed yet -> show recent conversations
  if (!trimmed) {
    return (
      <div className="flex-1 overflow-y-auto px-1 py-1">
        <h3 className="px-5 pt-2 pb-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Gần đây
        </h3>
        {recentConversations.length > 0 ? (
          <ul>
            {recentConversations.map((row) => (
              <ConversationListRow
                key={row.id}
                row={row}
                isActive={row.id === activeConversationId}
                isOnline={isOnline(row.peerId)}
              />
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-center text-xs text-[var(--text-secondary)]">
            Bắt đầu nhập để tìm kiếm tin nhắn hoặc người dùng.
          </p>
        )}
      </div>
    )
  }

  const hasConversations = matchingConversations.length > 0
  const hasPeople = matchingPeople.length > 0
  const hasNoResults = !hasConversations && !hasPeople && !isSearchingPeople

  // 2. No results match
  if (hasNoResults) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--text-secondary)]">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mb-3">
          <Icon name={ICON_NAMES.SEARCH} className="w-6 h-6 text-[var(--text-secondary)]" />
        </div>
        <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
          Không tìm thấy kết quả
        </h4>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
          Không có cuộc trò chuyện hoặc người dùng nào khớp với &quot;{trimmed}&quot;.
        </p>
      </div>
    )
  }

  // 3. Render matching sections
  return (
    <div className="flex-1 overflow-y-auto px-1 py-1">
      {/* Conversations Section */}
      {hasConversations && (
        <section aria-label="Cuộc trò chuyện phù hợp" className="mb-3">
          <h3 className="px-5 pt-2 pb-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Cuộc trò chuyện ({matchingConversations.length})
          </h3>
          <ul>
            {matchingConversations.map((row) => (
              <ConversationListRow
                key={row.id}
                row={row}
                isActive={row.id === activeConversationId}
                isOnline={isOnline(row.peerId)}
              />
            ))}
          </ul>
        </section>
      )}

      {/* People / Contacts Section */}
      {(hasPeople || isSearchingPeople) && (
        <section aria-label="Người dùng phù hợp">
          <h3 className="px-5 pt-2 pb-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Mọi người {hasPeople ? `(${matchingPeople.length})` : ""}
          </h3>
          {hasPeople && (
            <ul>
              {matchingPeople.map((person) => (
                <InboxSearchContactRow
                  key={person.id}
                  person={person}
                  isOnline={isOnline(person.id)}
                  isLoading={openingPersonId === person.id}
                  onSelect={onSelectPerson}
                />
              ))}
            </ul>
          )}
          {isSearchingPeople && (
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand)] border-r-transparent" />
              <span className="text-xs text-[var(--text-secondary)]">Đang tìm người dùng...</span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

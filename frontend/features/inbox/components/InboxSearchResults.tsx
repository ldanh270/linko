"use client"

import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useI18n } from "@/shared/i18n/useI18n"
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
  const { copy } = useI18n()
  const trimmed = search.trim()

  // 1. When search bar is focused but no query typed yet -> show recent conversations
  if (!trimmed) {
    return (
      <div className="flex-1 overflow-y-auto px-1 py-1">
        <h3 className="px-4 pt-2 pb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {copy.inbox.recent}
        </h3>
        {recentConversations.length > 0 ? (
          <ul className="px-2">
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
          <p className="px-4 py-6 text-center text-xs text-text-secondary">
            {copy.inbox.welcomeDescription}
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
      <div className="flex flex-col items-center justify-center p-8 text-center text-text-secondary">
        <div className="w-12 h-12 rounded-full bg-surface-subtle flex items-center justify-center mb-3">
          <Icon name={ICON_NAMES.SEARCH} className="w-6 h-6 text-text-secondary" />
        </div>
        <h4 className="text-sm font-semibold text-text-primary mb-1">
          {copy.inbox.searchEmptyTitle}
        </h4>
        <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
          {copy.inbox.searchEmptyDesc} &quot;{trimmed}&quot;.
        </p>
      </div>
    )
  }

  // 3. Render matching sections
  return (
    <div className="flex-1 overflow-y-auto px-1 py-1">
      {/* Conversations Section */}
      {hasConversations && (
        <section aria-label="Cuộc trò chuyện phù hợp" className="mb-4">
          <h3 className="px-4 pt-2 pb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {copy.inbox.conversationsMatch} ({matchingConversations.length})
          </h3>
          <ul className="px-2">
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
          <h3 className="px-4 pt-2 pb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            {copy.inbox.peopleMatch} {hasPeople ? `(${matchingPeople.length})` : ""}
          </h3>
          {hasPeople && (
            <ul className="px-2">
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
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-r-transparent" />
              <span className="text-xs text-text-secondary">{copy.inbox.searchingPeople}</span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

"use client"

import { SidebarPanel } from "@/shared/layout/SidebarPanel"
import { SidebarHeader } from "@/shared/layout/SidebarHeader"
import { SearchInput } from "@/shared/components/SearchInput"
import { Button } from "@/shared/components/Button"
import { ConversationListSkeleton, RecentPeopleStripSkeleton } from "@/shared/components/Skeleton"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useI18n } from "@/shared/i18n/useI18n"
import { useInboxSidebar } from "../hooks/useInboxSidebar"
import { ConversationList } from "./ConversationList"
import { RecentPeopleStrip } from "./RecentPeopleStrip"
import { InboxSearchResults } from "./InboxSearchResults"
import { CreateGroupModal } from "@/features/groups/components/CreateGroupModal"
import { AddContactModal } from "@/features/people/components/AddContactModal/AddContactModal"

/**
 * Render the Chats reference panel with localized copy and Messenger-style search transition.
 * When search is focused or active, the panel replaces category tabs and people strips
 * with live conversation & contact search results. UI only.
 */
export function InboxSidebar() {
  const state = useInboxSidebar()
  const { copy } = useI18n()
  const { searchState } = state

  return (
    <>
      <SidebarPanel
        header={
          <SidebarHeader
            title={copy.inbox.chatsTitle}
            action={
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={state.openCreateGroup}
                  aria-label={copy.inbox.createGroup}
                  className="grid place-items-center w-9 h-9 rounded-full text-xl text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand cursor-pointer"
                >
                  <Icon name={ICON_NAMES.GROUP} />
                </button>
                <button
                  type="button"
                  onClick={state.addContact.onOpen}
                  aria-label={copy.inbox.findFriends}
                  className="grid place-items-center w-9 h-9 rounded-full text-xl text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand cursor-pointer"
                >
                  <Icon name={ICON_NAMES.ADD_CONTACT} />
                </button>
              </div>
            }
          />
        }
      >
        {/* Search Bar Row */}
        <div className="flex items-center gap-2 px-4 mb-3">
          {searchState.isSearchActive && (
            <button
              type="button"
              onClick={searchState.handleExitSearch}
              aria-label={copy.inbox.backToConversations}
              className="grid place-items-center w-9 h-9 rounded-full text-lg text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand cursor-pointer flex-none"
            >
              <Icon name={ICON_NAMES.BACK} />
            </button>
          )}
          <SearchInput
            label={copy.inbox.searchInboxPlaceholder}
            placeholder={copy.inbox.searchPlaceholder}
            value={state.search}
            stateKey={state.searchRevision}
            onChange={state.onSearchChange}
            onFocus={searchState.handleEnterSearch}
            onClear={searchState.handleClearSearch}
            onKeyDown={searchState.handleSearchKeyDown}
            className="flex-1"
          />
        </div>

        {/* Content area: Messenger-style toggle between Search Mode and Normal Inbox Mode */}
        {searchState.isSearchActive ? (
          <InboxSearchResults
            search={state.search}
            recentConversations={searchState.recentConversations}
            matchingConversations={searchState.matchingConversations}
            matchingPeople={searchState.matchingPeople}
            isSearchingPeople={searchState.isSearchingPeople}
            activeConversationId={state.conversationId}
            isOnline={state.isOnline}
            openingPersonId={searchState.openingPersonId}
            onSelectPerson={searchState.handleSelectPerson}
          />
        ) : (
          <>
            {/* Recent active contacts horizontal strip */}
            {state.query.isPending ? (
              <RecentPeopleStripSkeleton />
            ) : state.people.length > 0 ? (
              <RecentPeopleStrip people={state.people} isOnline={state.isOnline} />
            ) : null}

            {/* Conversation category filter tabs */}
            <h2 className="px-4 mt-3 mb-2 text-base font-semibold text-text-primary">
              {copy.inbox.recent}
            </h2>

            <nav aria-label="Lọc hội thoại" className="flex gap-1 px-4 pb-2">
              {state.filters.map((filter) => (
                <Button key={filter.value} variant="ghost" aria-pressed={filter.isActive} onClick={filter.onSelect}>
                  {filter.label}
                </Button>
              ))}
            </nav>

            {/* Conversation rows list with skeleton, error and empty states */}
            {state.query.isPending ? (
              <ConversationListSkeleton />
            ) : state.query.isError ? (
              <ErrorState title="Không thể tải hộp thư" onRetry={state.onRetry} />
            ) : state.rows.length === 0 ? (
              <EmptyState title={copy.inbox.emptyTitle} description={copy.inbox.emptyDescription} />
            ) : (
              <ConversationList
                rows={state.rows}
                activeConversationId={state.conversationId}
                isOnline={state.isOnline}
              />
            )}

            {/* Pagination load more button */}
            {state.query.data?.nextCursor && (
              <Button className="m-4" variant="ghost" onClick={state.onLoadMore} isLoading={state.query.isFetching}>
                {copy.inbox.nextPage}
              </Button>
            )}
          </>
        )}
      </SidebarPanel>
      {/* Creation and contact modals */}
      {state.isCreateGroupOpen && <CreateGroupModal onClose={state.closeCreateGroup} />}
      {state.addContact.isOpen && <AddContactModal state={state.addContact} />}
    </>
  )
}

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
import { useInboxSidebar } from "../hooks/useInboxSidebar"
import { ConversationList } from "./ConversationList"
import { RecentPeopleStrip } from "./RecentPeopleStrip"
import { InboxSearchResults } from "./InboxSearchResults"
import { CreateGroupModal } from "@/features/groups/components/CreateGroupModal"
import { AddContactModal } from "@/features/people/components/AddContactModal/AddContactModal"

/**
 * Render the Chats reference panel with Messenger-style search transition.
 * When search is focused or active, the panel replaces category tabs and people strips
 * with live conversation & contact search results. UI only.
 */
export function InboxSidebar() {
  const state = useInboxSidebar()
  const { searchState } = state

  return (
    <>
      <SidebarPanel
        header={
          <SidebarHeader
            title="Tin nhắn"
            action={
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={state.openCreateGroup}
                  aria-label="Tạo nhóm"
                  className="grid place-items-center w-9 h-9 rounded-full text-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] cursor-pointer"
                >
                  <Icon name={ICON_NAMES.GROUP} />
                </button>
                <button
                  type="button"
                  onClick={state.addContact.onOpen}
                  aria-label="Tìm bạn bè"
                  className="grid place-items-center w-9 h-9 rounded-full text-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] cursor-pointer"
                >
                  <Icon name={ICON_NAMES.ADD_CONTACT} />
                </button>
              </div>
            }
          />
        }
      >
        {/* Search Bar Row */}
        <div className="flex items-center gap-2 mx-6 mb-3">
          {searchState.isSearchActive && (
            <button
              type="button"
              onClick={searchState.handleExitSearch}
              aria-label="Quay lại danh sách hội thoại"
              className="grid place-items-center w-9 h-9 rounded-full text-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] cursor-pointer flex-none"
            >
              <Icon name={ICON_NAMES.BACK} />
            </button>
          )}
          <SearchInput
            label="Tìm tin nhắn hoặc người dùng"
            placeholder="Tìm kiếm trên Linko"
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
            {state.query.isPending ? (
              <RecentPeopleStripSkeleton />
            ) : state.people.length > 0 ? (
              <RecentPeopleStrip people={state.people} isOnline={state.isOnline} />
            ) : null}

            <h2 className="mx-6 mt-4 mb-3 text-base font-semibold text-[var(--text-primary)]">Gần đây</h2>

            <nav aria-label="Lọc hội thoại" className="flex gap-1 px-6 pb-2">
              {state.filters.map((filter) => (
                <Button key={filter.value} variant="ghost" aria-pressed={filter.isActive} onClick={filter.onSelect}>
                  {filter.label}
                </Button>
              ))}
            </nav>

            {state.query.isPending ? (
              <ConversationListSkeleton />
            ) : state.query.isError ? (
              <ErrorState title="Không thể tải hộp thư" onRetry={state.onRetry} />
            ) : state.rows.length === 0 ? (
              <EmptyState title="Chưa có cuộc trò chuyện" description="Kết nối với bạn bè hoặc tạo nhóm để bắt đầu." />
            ) : (
              <ConversationList
                rows={state.rows}
                activeConversationId={state.conversationId}
                isOnline={state.isOnline}
              />
            )}

            {state.query.data?.nextCursor && (
              <Button className="m-4" variant="ghost" onClick={state.onLoadMore} isLoading={state.query.isFetching}>
                Trang tiếp theo
              </Button>
            )}
          </>
        )}
      </SidebarPanel>
      {state.isCreateGroupOpen && <CreateGroupModal onClose={state.closeCreateGroup} />}
      {state.addContact.isOpen && <AddContactModal state={state.addContact} />}
    </>
  )
}

"use client"

import { SidebarPanel } from "@/shared/layout/SidebarPanel"
import { SidebarHeader } from "@/shared/layout/SidebarHeader"
import { SearchInput } from "@/shared/components/SearchInput"
import { Button } from "@/shared/components/Button"
import { ConversationListSkeleton } from "@/shared/components/Skeleton"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useI18n } from "@/shared/i18n/useI18n"
import { useGroupsSidebar } from "../hooks/useGroupsSidebar"
import { GroupListRow } from "./GroupListRow"
import { CreateGroupModal } from "./CreateGroupModal"

/** Render the Groups reference panel with localized copy, in-place group creation, and search mode. UI only. */
export function GroupsSidebar() {
  const state = useGroupsSidebar()
  const { copy } = useI18n()

  return (
    <>
      <SidebarPanel
        header={
          <SidebarHeader
            title={copy.groups.title}
            action={
              <button
                type="button"
                onClick={state.openCreateGroup}
                aria-label={copy.groups.createGroupBtn}
                className="grid place-items-center w-9 h-9 rounded-full text-xl text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand cursor-pointer"
              >
                <Icon name={ICON_NAMES.GROUP} />
              </button>
            }
          />
        }
      >
        {/* Search filter row */}
        <div className="flex items-center gap-3 px-4 mb-4">
          {Boolean(state.search) && (
            <button
              type="button"
              onClick={() => state.onSearchChange("")}
              aria-label={copy.inbox.clearSearch}
              className="grid place-items-center w-9 h-9 rounded-full text-lg text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand cursor-pointer flex-none"
            >
              <Icon name={ICON_NAMES.BACK} />
            </button>
          )}
          <SearchInput
            label={copy.groups.title}
            placeholder={copy.groups.searchPlaceholder}
            value={state.search}
            stateKey={state.searchRevision}
            onChange={state.onSearchChange}
            onClear={() => state.onSearchChange("")}
            className="flex-1"
          />
        </div>

        {/* Groups list with loading, error, empty and result states */}
        {state.query.isPending ? (
          <ConversationListSkeleton />
        ) : state.query.isError ? (
          <ErrorState title="Không thể tải nhóm" onRetry={state.onRetry} />
        ) : state.rows.length ? (
          <ul className="px-2">
            {state.rows.map((group) => (
              <GroupListRow key={group.id} group={group} />
            ))}
          </ul>
        ) : state.search ? (
          <EmptyState
            title={copy.inbox.searchEmptyTitle}
            description={`${copy.inbox.searchEmptyDesc} "${state.search}".`}
          />
        ) : (
          <EmptyState
            title={copy.groups.emptyGroupsTitle}
            action={
              <Button variant="secondary" size="small" onClick={state.openCreateGroup}>
                {copy.groups.createFirstGroup}
              </Button>
            }
          />
        )}

        {!state.search && state.query.data?.nextCursor && (
          <Button className="m-4" variant="ghost" onClick={state.onLoadMore} isLoading={state.query.isFetching}>
            {copy.inbox.nextPage}
          </Button>
        )}
      </SidebarPanel>
      {/* Modal creation dialog */}
      {state.isCreateGroupOpen && <CreateGroupModal onClose={state.closeCreateGroup} />}
    </>
  )
}

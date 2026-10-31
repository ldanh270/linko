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
import { useGroupsSidebar } from "../hooks/useGroupsSidebar"
import { GroupListRow } from "./GroupListRow"
import { CreateGroupModal } from "./CreateGroupModal"

/** Render the Groups reference panel with in-place group creation modal dialog. UI only. */
export function GroupsSidebar() {
  const state = useGroupsSidebar()
  return (
    <>
      <SidebarPanel
        header={
          <SidebarHeader
            title="Nhóm"
            action={
              <button
                type="button"
                onClick={state.openCreateGroup}
                aria-label="Tạo nhóm"
                className="grid place-items-center w-9 h-9 rounded-full text-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] cursor-pointer"
              >
                <Icon name={ICON_NAMES.GROUP} />
              </button>
            }
          />
        }
      >
        <SearchInput
          label="Tìm nhóm đã tải"
          placeholder="Tìm nhóm"
          value={state.search}
          stateKey={state.searchRevision}
          onChange={state.onSearchChange}
          className="mx-6 mb-4"
        />
        {state.query.isPending ? (
          <ConversationListSkeleton />
        ) : state.query.isError ? (
          <ErrorState title="Không thể tải nhóm" onRetry={state.onRetry} />
        ) : state.rows.length ? (
          <ul>{state.rows.map((group) => <GroupListRow key={group.id} group={group} />)}</ul>
        ) : (
          <EmptyState
            title="Chưa có nhóm nào"
            action={
              <Button variant="secondary" size="small" onClick={state.openCreateGroup}>
                Tạo nhóm đầu tiên
              </Button>
            }
          />
        )}
        {state.search && <p className="px-6 py-3 text-xs text-[var(--text-secondary)]">Tìm trong các nhóm ở trang đã tải.</p>}
        {state.query.data?.nextCursor && (
          <Button className="m-4" variant="ghost" onClick={state.onLoadMore} isLoading={state.query.isFetching}>
            Trang tiếp theo
          </Button>
        )}
      </SidebarPanel>
      {state.isCreateGroupOpen && <CreateGroupModal onClose={state.closeCreateGroup} />}
    </>
  )
}

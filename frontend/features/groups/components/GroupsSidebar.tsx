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

/** Render the Groups reference panel with in-place group creation and search mode. UI only. */
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
        <div className="flex items-center gap-2 mx-6 mb-4">
          {Boolean(state.search) && (
            <button
              type="button"
              onClick={() => state.onSearchChange("")}
              aria-label="Xóa bộ lọc nhóm"
              className="grid place-items-center w-9 h-9 rounded-full text-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] cursor-pointer flex-none"
            >
              <Icon name={ICON_NAMES.BACK} />
            </button>
          )}
          <SearchInput
            label="Tìm nhóm"
            placeholder="Tìm kiếm nhóm..."
            value={state.search}
            stateKey={state.searchRevision}
            onChange={state.onSearchChange}
            onClear={() => state.onSearchChange("")}
            className="flex-1"
          />
        </div>

        {state.query.isPending ? (
          <ConversationListSkeleton />
        ) : state.query.isError ? (
          <ErrorState title="Không thể tải nhóm" onRetry={state.onRetry} />
        ) : state.rows.length ? (
          <ul>
            {state.rows.map((group) => (
              <GroupListRow key={group.id} group={group} />
            ))}
          </ul>
        ) : state.search ? (
          <EmptyState
            title="Không tìm thấy nhóm nào"
            description={`Không có nhóm nào khớp với "${state.search}".`}
          />
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

        {!state.search && state.query.data?.nextCursor && (
          <Button className="m-4" variant="ghost" onClick={state.onLoadMore} isLoading={state.query.isFetching}>
            Trang tiếp theo
          </Button>
        )}
      </SidebarPanel>
      {state.isCreateGroupOpen && <CreateGroupModal onClose={state.closeCreateGroup} />}
    </>
  )
}

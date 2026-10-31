"use client"

import { SidebarHeader } from "@/shared/layout/SidebarHeader"
import { SidebarPanel } from "@/shared/layout/SidebarPanel"
import { SearchInput } from "@/shared/components/SearchInput"
import { IconButton } from "@/shared/components/IconButton"
import { Button } from "@/shared/components/Button"
import { ContactsListSkeleton } from "@/shared/components/Skeleton"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { usePeoplePage } from "../hooks/usePeoplePage"
import { ContactGroup } from "./ContactGroup"
import { AddContactModal } from "./AddContactModal/AddContactModal"
import { PersonProfilePanel } from "./PersonProfilePanel"

/** Render the alphabetical Contacts reference with clear search results. UI only. */
export function ContactsSidebar() {
  const state = usePeoplePage()

  return (
    <SidebarPanel
      header={
        <SidebarHeader
          title="Danh bạ"
          action={
            <IconButton
              label="Thêm bạn bè"
              icon={<Icon name={ICON_NAMES.ADD_CONTACT} />}
              onClick={state.onOpenAdd}
            />
          }
        />
      }
    >
      {/* Contacts search bar */}
      <div className="flex items-center gap-2 px-4 mb-3">
        {Boolean(state.search) && (
          <button
            type="button"
            onClick={() => state.onSearchChange("")}
            aria-label="Xóa bộ lọc danh bạ"
            className="grid place-items-center w-9 h-9 rounded-full text-lg text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand cursor-pointer flex-none"
          >
            <Icon name={ICON_NAMES.BACK} />
          </button>
        )}
        <SearchInput
          label="Tìm trong danh bạ"
          placeholder="Tìm kiếm danh bạ..."
          value={state.search}
          stateKey={state.searchRevision}
          onChange={state.onSearchChange}
          onClear={() => state.onSearchChange("")}
          className="flex-1"
        />
      </div>

      {/* Pending friend requests action banner */}
      {state.requestRows.length > 0 && !state.search && (
        <Button className="mx-4 mb-3" variant="ghost" onClick={state.onOpenAdd}>
          Lời mời kết bạn ({state.requestRows.length})
        </Button>
      )}

      {/* Grouped alphabetical contacts list with skeleton and empty states */}
      {state.friends.isPending ? (
        <ContactsListSkeleton />
      ) : state.friends.isError ? (
        <ErrorState title="Không thể tải danh bạ" onRetry={state.onRetry} />
      ) : state.groups.length ? (
        state.groups.map((group) => <ContactGroup key={group.letter} group={group} />)
      ) : state.search ? (
        <EmptyState
          title="Không tìm thấy liên hệ nào"
          description={`Không có người dùng nào khớp với "${state.search}".`}
        />
      ) : (
        <EmptyState title="Chưa có liên hệ" description="Thêm bạn bè để bắt đầu trò chuyện." />
      )}

      {/* Add contact modal dialog */}
      {state.isAdding && <AddContactModal state={state} />}
      {state.userId && <PersonProfilePanel state={state} />}
    </SidebarPanel>
  )
}

"use client"

import { Button } from "@/shared/components/Button"
import { SearchInput } from "@/shared/components/SearchInput"
import { Badge } from "@/shared/components/Badge"
import { PeoplePageSkeleton } from "@/shared/components/Skeleton"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { usePresence } from "@/shared/presence/usePresence"
import { usePeoplePage } from "../hooks/usePeoplePage"
import { AddContactModal } from "../components/AddContactModal/AddContactModal"
import { PersonProfilePanel } from "../components/PersonProfilePanel"
import { PendingRequestsBanner } from "../components/PendingRequestsBanner"
import { ContactCard } from "../components/ContactCard"

/** Render the full-page contacts directory with alphabetical grouping and quick actions. UI only. */
export function PeoplePage() {
  const state = usePeoplePage()

  const friendIds = (state.friends.data ?? []).map((f) => f.id)
  const presence = usePresence(friendIds)
  const totalFriends = state.friends.data?.length ?? 0

  return (
    <section className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        eyebrow="Kết nối & Giao tiếp"
        title="Danh bạ"
        description="Quản lý danh sách bạn bè, tìm kiếm liên hệ và bắt đầu cuộc trò chuyện mới."
        actions={
          <Button onClick={state.onOpenAdd}>
            <Icon name={ICON_NAMES.ADD_CONTACT} /> Thêm bạn mới
          </Button>
        }
      />

      {/* Pending Friend Requests Banner if any */}
      <PendingRequestsBanner
        count={state.requestRows.length}
        onOpen={state.onOpenAdd}
      />

      {/* Search and Stats Bar */}
      <div className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-[var(--shadow-panel)] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <SearchInput
            label="Tìm trong danh bạ"
            placeholder="Tìm theo tên bạn bè..."
            value={state.search}
            stateKey={state.searchRevision}
            onChange={state.onSearchChange}
          />
        </div>
        <div className="text-sm font-medium text-[var(--text-secondary)]">
          Tổng cộng: <span className="font-bold text-[var(--text-primary)]">{totalFriends}</span> bạn bè
        </div>
      </div>

      {/* Main Friends List */}
      {state.friends.isPending ? (
        <PeoplePageSkeleton />
      ) : state.friends.isError ? (
        <ErrorState title="Không thể tải danh bạ" onRetry={state.onRetry} />
      ) : !state.groups.length ? (
        <EmptyState
          title="Chưa có bạn bè nào"
          description={
            state.search
              ? "Không tìm thấy bạn bè nào khớp với từ khóa tìm kiếm."
              : "Bắt đầu kết nối với bạn bè trên Linko để cùng trò chuyện."
          }
          action={
            !state.search ? (
              <Button onClick={state.onOpenAdd}>
                <Icon name={ICON_NAMES.ADD_CONTACT} /> Tìm và thêm bạn
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-6">
          {state.groups.map((group) => (
            <div key={group.letter} className="grid gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="brand" shape="rounded" size="sm" className="h-7 w-7 text-xs font-bold">
                  {group.letter}
                </Badge>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {group.contacts.length} liên hệ
                </span>
                <div className="flex-1 border-t border-[var(--border)]" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.contacts.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    isOnline={presence.isOnline(contact.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {state.isAdding && <AddContactModal state={state} />}
      {state.userId && <PersonProfilePanel state={state} />}
    </section>
  )
}

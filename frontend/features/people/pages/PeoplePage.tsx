"use client"

import { Button } from "@/shared/components/Button"
import { SearchInput } from "@/shared/components/SearchInput"
import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import { DropdownMenu } from "@/shared/components/DropdownMenu/DropdownMenu"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { usePresence } from "@/shared/presence/usePresence"
import { usePeoplePage } from "../hooks/usePeoplePage"
import { AddContactModal } from "../components/AddContactModal/AddContactModal"
import { PersonProfilePanel } from "../components/PersonProfilePanel"

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
      {state.requestRows.length > 0 && (
        <div className="surface-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-[var(--brand)]/30 bg-[var(--brand-soft)]/20">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand)] text-white">
              <Icon name={ICON_NAMES.ADD_CONTACT} />
            </div>
            <div>
              <p className="font-semibold text-sm">Lời mời kết bạn đang chờ</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Bạn có {state.requestRows.length} lời mời kết bạn mới cần phản hồi.
              </p>
            </div>
          </div>
          <Button size="small" variant="secondary" onClick={state.onOpenAdd}>
            Xem lời mời ({state.requestRows.length})
          </Button>
        </div>
      )}

      {/* Search and Stats Bar */}
      <div className="surface-panel p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
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
        <LoadingState label="Đang tải danh bạ..." />
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
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                  {group.letter}
                </span>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {group.contacts.length} liên hệ
                </span>
                <div className="flex-1 border-t border-[var(--border)]" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.contacts.map((contact) => (
                  <article
                    key={contact.id}
                    className="surface-panel flex items-center justify-between gap-3 p-3.5 transition-shadow hover:shadow-md"
                  >
                    <Link
                      href={buildAppRoute(APP_ROUTES.USER_PROFILE, { userId: contact.id })}
                      className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-opacity"
                      title={`Xem hồ sơ của ${contact.name}`}
                    >
                      <Avatar label={contact.name} size="medium" isOnline={presence.isOnline(contact.id)} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" title={contact.name}>
                          {contact.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {presence.isOnline(contact.id) ? (
                            <span className="text-[var(--positive)] font-medium">Trực tuyến</span>
                          ) : (
                            "Ngoại tuyến"
                          )}
                        </p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1.5 flex-none">
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={contact.isOpening}
                        onClick={contact.onOpen}
                        title="Nhắn tin"
                      >
                        <Icon name={ICON_NAMES.CHAT} />
                      </Button>
                      <DropdownMenu label={`Tùy chọn ${contact.name}`} items={contact.menu} />
                    </div>
                  </article>
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

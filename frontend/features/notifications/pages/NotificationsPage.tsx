"use client"

import { Button } from "@/shared/components/Button"
import { Avatar } from "@/shared/components/Avatar"
import { LoadingState } from "@/shared/components/LoadingState"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useNotificationsPage, type NotificationFilter } from "../hooks/useNotificationsPage"

const FILTER_TABS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "requests", label: "Lời mời kết bạn" },
  { id: "messages", label: "Tin nhắn" },
]

/** Full-page notifications dashboard with push alert opt-in and filter tabs. UI only. */
export function NotificationsPage() {
  const state = useNotificationsPage()

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Cập nhật & Tin tức"
        title="Thông báo"
        description="Theo dõi lời mời kết bạn, hoạt động tin nhắn và thông báo hệ thống của bạn."
      />

      {/* Push Notification Banner */}
      {state.push.isSupported && (
        <div className="surface-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-[var(--brand)]/30 bg-[var(--brand-soft)]/20">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand)] text-white shadow-sm">
              <Icon name={ICON_NAMES.BELL} />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {state.push.permission === "granted"
                  ? "Thông báo đẩy đang hoạt động"
                  : "Bật thông báo đẩy trên trình duyệt"}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {state.push.permission === "granted"
                  ? "Bạn sẽ nhận được thông báo khi có tin nhắn mới hoặc lời mời kết bạn ngay cả khi không mở tab."
                  : "Không bỏ lỡ các tin nhắn khẩn và lời mời kết bạn mới bằng cách cấp quyền thông báo."}
              </p>
            </div>
          </div>

          {state.push.permission !== "granted" ? (
            <Button
              size="small"
              onClick={() => void state.push.requestPermission()}
              className="shrink-0"
            >
              <Icon name={ICON_NAMES.BELL} /> Kích hoạt thông báo
            </Button>
          ) : (
            <span className="shrink-0 rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--brand)] border border-[var(--border)]">
              Đã kích hoạt
            </span>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
        {FILTER_TABS.map((tab) => {
          const isActive = state.filter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => state.setFilter(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text)]"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Notifications List */}
      {state.isLoading ? (
        <LoadingState label="Đang tải thông báo của bạn..." />
      ) : state.isError ? (
        <ErrorState title="Không thể tải thông báo" onRetry={state.onRetry} />
      ) : state.items.length === 0 ? (
        <EmptyState
          title="Không có thông báo nào"
          description="Bạn đã cập nhật tất cả thông báo trong danh mục này."
        />
      ) : (
        <div className="grid gap-3">
          {state.items.map((item) => (
            <article
              key={item.id}
              className={`surface-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition hover:border-[var(--brand)]/40 ${
                item.isUnread ? "bg-[var(--surface)] border-l-4 border-l-[var(--brand)]" : "bg-[var(--surface)]/70"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {item.type === "friend_request" ? (
                  <Avatar label={item.title} src={item.avatarUrl} size="medium" />
                ) : item.type === "message" ? (
                  <Avatar label={item.title} src={item.avatarUrl} size="medium" />
                ) : (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Icon name={ICON_NAMES.BELL} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                    {item.isUnread && (
                      <span className="h-2 w-2 rounded-full bg-[var(--brand)] shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 flex items-center gap-1">
                    <Icon name={ICON_NAMES.CLOCK} className="h-3 w-3" />
                    <span>{item.time}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {item.secondaryAction && item.secondaryActionLabel && (
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={item.secondaryAction}
                  >
                    {item.secondaryActionLabel}
                  </Button>
                )}
                {item.onAction && item.actionLabel && (
                  <Button
                    size="small"
                    onClick={item.onAction}
                  >
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

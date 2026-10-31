"use client"

import { Button } from "@/shared/components/Button"
import { Avatar } from "@/shared/components/Avatar"
import { NotificationsListSkeleton } from "@/shared/components/Skeleton"
import { ErrorState } from "@/shared/components/ErrorState"
import { EmptyState } from "@/shared/components/EmptyState"
import { PageHeader } from "@/shared/components/PageHeader"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useI18n } from "@/shared/i18n/useI18n"
import { useNotificationsPage, type NotificationFilter } from "../hooks/useNotificationsPage"

/** Full-page notifications dashboard with category filter tabs. UI only. */
export function NotificationsPage() {
  const state = useNotificationsPage()
  const { copy } = useI18n()

  const filterTabs: Array<{ id: NotificationFilter; label: string }> = [
    { id: "all", label: copy.notifications.tabAll },
    { id: "requests", label: copy.notifications.tabRequests },
    { id: "messages", label: copy.notifications.tabMessages },
  ]

  return (
    <section className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow={copy.notifications.eyebrow}
        title={copy.notifications.title}
        description={copy.notifications.description}
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {filterTabs.map((tab) => {
          const isActive = state.filter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => state.setFilter(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Notifications List */}
      {state.isLoading ? (
        <NotificationsListSkeleton />
      ) : state.isError ? (
        <ErrorState title={copy.notifications.errorTitle} onRetry={state.onRetry} />
      ) : state.items.length === 0 ? (
        <EmptyState
          title={copy.notifications.emptyTitle}
          description={copy.notifications.emptyDescription}
        />
      ) : (
        <div className="grid gap-3">
          {state.items.map((item) => (
            <article
              key={item.id}
              className={`border border-border rounded-panel bg-surface shadow-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition hover:border-brand/40 ${
                item.isUnread ? "bg-surface border-l-4 border-l-brand" : "bg-surface/70"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                {item.type === "friend_request" ? (
                  <Avatar label={item.title} src={item.avatarUrl} size="medium" />
                ) : item.type === "message" ? (
                  <Avatar label={item.title} src={item.avatarUrl} size="medium" />
                ) : (
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                    <Icon name={ICON_NAMES.BELL} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                    {item.isUnread && (
                      <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1">
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

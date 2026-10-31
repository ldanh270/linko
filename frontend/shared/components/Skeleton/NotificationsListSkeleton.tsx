import { Skeleton } from "./Skeleton"

/** Render notifications list skeleton matching item heights and actions. UI only. */
export function NotificationsListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Đang tải thông báo">
      {Array.from({ length: 4 }).map((_, i) => (
        <article
          key={i}
          className="flex items-center gap-3.5 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
        >
          <Skeleton circle className="w-10 h-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2 rounded-xs" />
            <Skeleton className="h-3 w-1/3 rounded-xs" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
        </article>
      ))}
      <span className="sr-only">Đang tải thông báo</span>
    </div>
  )
}

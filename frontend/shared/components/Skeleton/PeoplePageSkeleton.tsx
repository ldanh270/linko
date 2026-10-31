import { Skeleton } from "./Skeleton"

/** Render grid of contact card skeletons for the full-page contacts directory. UI only. */
export function PeoplePageSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Đang tải danh bạ">
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-xs" />
          <div className="flex-1 border-t border-[var(--border)]" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <article key={i} className="surface-panel flex items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Skeleton circle className="w-10 h-10 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-28 rounded-xs" />
                  <Skeleton className="h-3 w-16 rounded-xs" />
                </div>
              </div>
              <Skeleton circle className="w-8 h-8 shrink-0" />
            </article>
          ))}
        </div>
      </div>
      <span className="sr-only">Đang tải danh bạ</span>
    </div>
  )
}

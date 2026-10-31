import { Skeleton } from "./Skeleton"

/** Render settings sidebar skeleton with account card and accordion items. UI only. */
export function SettingsSidebarSkeleton() {
  return (
    <div className="flex flex-col" role="status" aria-label="Đang tải cài đặt">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton circle className="w-10 h-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-xs" />
            <Skeleton className="h-3 w-20 rounded-xs" />
          </div>
        </div>
      </div>
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-[var(--radius-md)]" />
        ))}
      </div>
      <span className="sr-only">Đang tải cài đặt</span>
    </div>
  )
}

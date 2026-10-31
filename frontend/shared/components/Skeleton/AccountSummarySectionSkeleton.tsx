import { Skeleton } from "./Skeleton"

/** Render account summary skeleton card to eliminate CLS on settings page. UI only. */
export function AccountSummarySectionSkeleton() {
  return (
    <article className="border border-border rounded-panel bg-surface shadow-panel p-4 sm:p-5 grid gap-5" role="status" aria-label="Đang tải thông tin tài khoản">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-36 rounded-xs" />
          <Skeleton className="h-4 w-64 rounded-xs" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      <div className="flex items-center gap-4">
        <Skeleton circle className="w-16 h-16 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40 rounded-xs" />
          <Skeleton className="h-4 w-28 rounded-xs" />
        </div>
      </div>
      <span className="sr-only">Đang tải thông tin tài khoản</span>
    </article>
  )
}

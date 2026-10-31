import { Skeleton } from "./Skeleton"

export interface ConversationListSkeletonProps {
  readonly count?: number
}

/** Render placeholder conversation rows to preserve list layout without layout shifts. UI only. */
export function ConversationListSkeleton({ count = 6 }: ConversationListSkeletonProps) {
  return (
    <div className="flex flex-col px-2" role="status" aria-label="Đang tải danh sách hội thoại">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 px-3 py-3 rounded-[var(--radius-lg)]"
        >
          <Skeleton circle className="w-10 h-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28 rounded-xs" />
              <Skeleton className="h-3 w-10 rounded-xs" />
            </div>
            <Skeleton className="h-3.5 w-3/4 rounded-xs" />
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải danh sách hội thoại</span>
    </div>
  )
}

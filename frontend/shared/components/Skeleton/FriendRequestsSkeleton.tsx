import { Skeleton } from "./Skeleton"

/** Render friend requests skeleton in add contact modal. UI only. */
export function FriendRequestsSkeleton() {
  return (
    <div className="space-y-2.5 my-2" role="status" aria-label="Đang tải lời mời kết bạn">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-border">
          <Skeleton circle className="w-9 h-9 shrink-0" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-28 rounded-xs" />
            <Skeleton className="h-3 w-16 rounded-xs" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải lời mời kết bạn</span>
    </div>
  )
}

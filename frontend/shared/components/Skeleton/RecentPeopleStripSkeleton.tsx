import { Skeleton } from "./Skeleton"

/** Render horizontal recent people card skeletons to prevent content jumping downwards. UI only. */
export function RecentPeopleStripSkeleton() {
  return (
    <div
      className="flex gap-2.5 overflow-x-auto px-6 pt-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="status"
      aria-label="Đang tải danh sách gần đây"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center w-[76px] min-w-[76px] p-2 py-3 gap-2 rounded-[var(--radius-lg)] bg-[var(--input-surface)]/40 border border-[var(--border-subtle)]"
        >
          <Skeleton circle className="w-9 h-9" />
          <Skeleton className="h-3 w-10 rounded-xs" />
        </div>
      ))}
      <span className="sr-only">Đang tải danh sách gần đây</span>
    </div>
  )
}

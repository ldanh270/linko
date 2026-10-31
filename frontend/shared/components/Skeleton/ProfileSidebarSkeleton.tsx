import { Skeleton } from "./Skeleton"

/** Render profile sidebar panel skeleton preserving avatar, header, and about card layout. UI only. */
export function ProfileSidebarSkeleton() {
  return (
    <div className="flex flex-col" role="status" aria-label="Đang tải hồ sơ">
      <div className="grid justify-items-center gap-3 px-4 pt-2 pb-4 border-b border-[var(--border)]">
        <Skeleton circle className="w-20 h-20" />
        <Skeleton className="h-5 w-36 rounded-xs mt-1" />
        <Skeleton className="h-4 w-24 rounded-xs" />
      </div>
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        <div className="border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] p-4 space-y-4">
          <Skeleton className="h-4 w-28 rounded-xs" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded-xs" />
            <Skeleton className="h-4 w-3/4 rounded-xs" />
            <Skeleton className="h-4 w-1/2 rounded-xs" />
          </div>
        </div>
      </div>
      <span className="sr-only">Đang tải hồ sơ</span>
    </div>
  )
}

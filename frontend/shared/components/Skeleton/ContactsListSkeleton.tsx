import { Skeleton } from "./Skeleton"

/** Render alphabetical contact list skeleton to prevent panel height collapse. UI only. */
export function ContactsListSkeleton() {
  return (
    <div className="space-y-4 px-4 py-2" role="status" aria-label="Đang tải danh bạ">
      {Array.from({ length: 3 }).map((_, groupIdx) => (
        <div key={groupIdx} className="space-y-2">
          <Skeleton className="h-4 w-6 rounded-xs" />
          <div className="space-y-1">
            {Array.from({ length: 2 }).map((_, rowIdx) => (
              <div key={rowIdx} className="flex items-center gap-3 py-2">
                <Skeleton circle className="w-9 h-9 shrink-0" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28 rounded-xs" />
                  <Skeleton className="h-3 w-16 rounded-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">Đang tải danh bạ</span>
    </div>
  )
}

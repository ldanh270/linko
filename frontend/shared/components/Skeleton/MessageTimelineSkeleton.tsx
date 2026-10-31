import { Skeleton } from "./Skeleton"

/** Render timeline message bubbles skeleton to preserve chat viewport height and prevent layout shift. UI only. */
export function MessageTimelineSkeleton() {
  return (
    <div
      className="flex-1 min-h-0 flex flex-col justify-end gap-4 overflow-hidden px-4 pt-4 pb-4"
      role="status"
      aria-label="Đang tải tin nhắn"
    >
      {/* Date Pill Skeleton */}
      <div className="flex items-center justify-center my-2">
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* Incoming Message Skeleton */}
      <div className="flex items-end gap-3 max-w-[70%]">
        <Skeleton circle className="w-9 h-9 shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-14 w-52 rounded-lg rounded-bl-none" />
          <Skeleton className="h-3 w-12 rounded-xs" />
        </div>
      </div>

      {/* Outgoing Message Skeleton */}
      <div className="flex items-end justify-end gap-3 self-end max-w-[70%]">
        <div className="space-y-1 flex flex-col items-end">
          <Skeleton className="h-10 w-44 rounded-lg rounded-br-none" />
          <Skeleton className="h-3 w-10 rounded-xs" />
        </div>
      </div>

      {/* Another Incoming Message Skeleton */}
      <div className="flex items-end gap-3 max-w-[70%]">
        <Skeleton circle className="w-9 h-9 shrink-0" />
        <div className="space-y-1">
          <Skeleton className="h-16 w-64 rounded-lg rounded-bl-none" />
          <Skeleton className="h-3 w-14 rounded-xs" />
        </div>
      </div>

      {/* Another Outgoing Message Skeleton */}
      <div className="flex items-end justify-end gap-3 self-end max-w-[70%]">
        <div className="space-y-1 flex flex-col items-end">
          <Skeleton className="h-12 w-56 rounded-lg rounded-br-none" />
          <Skeleton className="h-3 w-10 rounded-xs" />
        </div>
      </div>

      <span className="sr-only">Đang tải tin nhắn</span>
    </div>
  )
}

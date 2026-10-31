import { Skeleton } from "./Skeleton"
import { MessageTimelineSkeleton } from "./MessageTimelineSkeleton"

/** Render full chat pane skeleton with header, timeline and composer to avoid viewport collapse. UI only. */
export function ConversationPaneSkeleton() {
  return (
    <div
      className="flex flex-col h-full min-h-0 bg-surface"
      role="status"
      aria-label="Đang mở cuộc trò chuyện"
    >
      {/* Header Skeleton */}
      <header className="flex min-h-[var(--header-height)] items-center justify-between gap-4 border-b border-border px-4 py-3.5 bg-surface">
        <div className="flex items-center gap-3">
          <Skeleton circle className="w-9 h-9 shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-xs" />
            <Skeleton className="h-3 w-16 rounded-xs" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton circle className="w-9 h-9" />
          <Skeleton circle className="w-9 h-9" />
        </div>
      </header>

      {/* Timeline Skeleton */}
      <MessageTimelineSkeleton />

      {/* Composer Skeleton */}
      <div className="relative border-t border-border px-4 py-3.5 bg-surface flex items-center gap-3">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton circle className="w-9 h-9 shrink-0" />
        <Skeleton circle className="w-9 h-9 shrink-0" />
      </div>

      <span className="sr-only">Đang mở cuộc trò chuyện</span>
    </div>
  )
}

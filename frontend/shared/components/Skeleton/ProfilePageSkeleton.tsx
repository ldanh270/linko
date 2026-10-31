import { Skeleton } from "./Skeleton"

/** Render full profile page skeleton for own account and public view. UI only. */
export function ProfilePageSkeleton() {
  return (
    <section className="mx-auto grid max-w-4xl gap-6" role="status" aria-label="Đang tải hồ sơ">
      {/* Page Header placeholder */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-28 rounded-xs" />
        <Skeleton className="h-8 w-56 rounded-md" />
        <Skeleton className="h-4 w-80 rounded-xs" />
      </div>

      {/* Cover Banner & Identity Card */}
      <article className="surface-panel overflow-hidden">
        <Skeleton className="h-44 w-full rounded-none" />
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 mb-4">
            <div className="relative inline-block rounded-full ring-4 ring-[var(--surface)] shadow-md">
              <Skeleton circle className="w-24 h-24" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-44 rounded-xs" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-md rounded-xs" />
          </div>
        </div>
      </article>

      {/* 2-Column Info Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <article className="surface-panel p-6 space-y-4">
          <Skeleton className="h-5 w-36 rounded-xs border-b border-[var(--border)] pb-3" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded-xs" />
            <Skeleton className="h-4 w-4/5 rounded-xs" />
            <Skeleton className="h-4 w-2/3 rounded-xs" />
          </div>
        </article>
        <article className="surface-panel p-6 space-y-4">
          <Skeleton className="h-5 w-36 rounded-xs border-b border-[var(--border)] pb-3" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded-xs" />
            <Skeleton className="h-4 w-4/5 rounded-xs" />
            <Skeleton className="h-4 w-2/3 rounded-xs" />
          </div>
        </article>
      </div>
      <span className="sr-only">Đang tải hồ sơ</span>
    </section>
  )
}

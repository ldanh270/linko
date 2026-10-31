/** Show a named loading region to assistive technology. UI only. */
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return <div role="status" aria-label={label} className="flex min-h-40 items-center justify-center rounded-xl bg-surface">
    <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-r-transparent motion-reduce:animate-none" />
    <span className="sr-only">{label}</span>
  </div>
}

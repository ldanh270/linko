import { Button } from "./Button"

/** Failure view props with an optional retry action. */
export interface ErrorStateProps { title?: string; requestId?: string; onRetry?: () => void }

/** Show a safe error message and support reference. UI only. */
export function ErrorState({ title = "Something went wrong", requestId, onRetry }: ErrorStateProps) {
  return <section role="alert" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
    <h2 className="text-lg font-semibold">{title}</h2>
    {requestId && <p className="mt-2 text-sm text-[var(--text-secondary)]">Reference: {requestId}</p>}
    {onRetry && <Button onClick={onRetry} className="mt-5">Try again</Button>}
  </section>
}

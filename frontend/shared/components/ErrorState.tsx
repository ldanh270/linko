import { Button } from "./Button"

/** Failure view props with an optional retry action. */
export interface ErrorStateProps { title?: string; requestId?: string; onRetry?: () => void }

/** Show a safe error message and support reference. UI only. */
export function ErrorState({ title = "Something went wrong", requestId, onRetry }: ErrorStateProps) {
  return (
    <section role="alert" className="m-4 rounded-xl border border-border bg-surface p-4 text-center">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {requestId && <p className="mt-1.5 text-sm text-text-secondary">Reference: {requestId}</p>}
      {onRetry && (
        <Button onClick={onRetry} className="mt-4" size="small">
          Thử lại
        </Button>
      )}
    </section>
  )
}

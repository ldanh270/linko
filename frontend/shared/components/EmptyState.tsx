import type { ReactNode } from "react"

/** Empty data view props. */
export interface EmptyStateProps { title: string; description?: string; action?: ReactNode }

/** Explain an empty view and optionally offer its next action. UI only. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
    <h2 className="text-lg font-semibold">{title}</h2>
    {description && <p className="mt-2 text-sm text-[var(--text-secondary)]">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </section>
}

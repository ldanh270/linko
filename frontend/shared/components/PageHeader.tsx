import type { ReactNode } from "react"

/** Properties for a shared page heading and its optional action slot. */
export interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

/** Render the common title hierarchy used by feature pages. UI only. */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold tracking-[0.04em] text-[var(--brand)]">{eyebrow}</p>}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-[var(--text-primary)]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

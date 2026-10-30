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
  return <header className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <p className="page-eyebrow mb-1">{eyebrow}</p>}
      <h1 className="page-title">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </header>
}

import type { ReactNode } from "react"

/** Heading/action props shared by all reference panels. */
export interface SidebarHeaderProps { readonly title: string; readonly action?: ReactNode }

/** Render the consistent title/action spacing of reference sidebars. UI only. */
export function SidebarHeader({ title, action }: SidebarHeaderProps) {
  return (
    <header className="flex min-h-[var(--header-height)] items-center justify-between gap-3 px-4 py-3.5">
      <h1 className="text-xl font-semibold leading-tight text-[var(--text-primary)]">{title}</h1>
      {action}
    </header>
  )
}

import type { ReactNode } from "react"

/** Heading/action props shared by all reference panels. */
export interface SidebarHeaderProps { readonly title: string; readonly action?: ReactNode }

/** Render the consistent title/action spacing of reference sidebars. UI only. */
export function SidebarHeader({ title, action }: SidebarHeaderProps) {
  return <header className="sidebar-header"><h1>{title}</h1>{action}</header>
}

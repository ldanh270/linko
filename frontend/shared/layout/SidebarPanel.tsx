import type { ReactNode } from "react"

/** Header and body slots for a shared sidebar. */
export interface SidebarPanelProps { readonly header: ReactNode; readonly children: ReactNode }

/** Keep panel headers fixed while the feature body scrolls independently. UI only. */
export function SidebarPanel({ header, children }: SidebarPanelProps) {
  return <section className="sidebar-panel">{header}<div className="sidebar-scroll">{children}</div></section>
}

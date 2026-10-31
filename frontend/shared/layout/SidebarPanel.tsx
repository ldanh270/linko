import type { ReactNode } from "react"

/** Header and body slots for a shared sidebar. */
export interface SidebarPanelProps { readonly header: ReactNode; readonly children: ReactNode }

/** Keep panel headers fixed while the feature body scrolls independently. UI only. */
export function SidebarPanel({ header, children }: SidebarPanelProps) {
  return (
    <section className="flex flex-col h-full min-h-0 bg-background">
      {header}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#a2adb755_transparent]">
        {children}
      </div>
    </section>
  )
}

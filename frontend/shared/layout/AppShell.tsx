"use client"

import type { ReactNode } from "react"
import { NavigationRail } from "./NavigationRail"
import { MobileNavigation } from "./MobileNavigation"
import { useAppShell } from "./useAppShell"

/** Shared shell props supply account UI from the feature composition boundary. */
export interface AppShellProps { readonly children: ReactNode; readonly account?: ReactNode }

/** Compose the reference rail with workspace or secondary detail pages. UI only. */
export function AppShell({ children, account }: AppShellProps) {
  const { links, toggleTheme, isDetail } = useAppShell()
  return <div className="app-layout">
    <NavigationRail links={links} onToggleTheme={toggleTheme} account={account} />
    <main id="main-content" className={`app-main ${isDetail ? "detail-layout" : ""}`}>{children}</main>
    <MobileNavigation links={links} />
  </div>
}

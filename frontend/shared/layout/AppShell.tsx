"use client"

import type { ReactNode } from "react"
import { NavigationRail } from "./NavigationRail"
import { MobileNavigation } from "./MobileNavigation"
import { useAppShell } from "./useAppShell"

/** Shared shell props supply account UI from the feature composition boundary. */
export interface AppShellProps { readonly children: ReactNode; readonly account?: ReactNode }

/** Compose the reference rail with workspace or secondary detail pages. UI only. */
export function AppShell({ children, account }: AppShellProps) {
  const { links, mobileLinks, toggleTheme, isDetail } = useAppShell()
  return (
    <div className="h-dvh overflow-hidden lg:grid lg:grid-cols-[var(--rail-width)_minmax(0,1fr)]">
      <NavigationRail links={links} onToggleTheme={toggleTheme} account={account} />
      <main
        id="main-content"
        className={`min-h-0 h-full min-w-0 ${
          isDetail ? "h-full overflow-y-auto px-6 pt-6 pb-24 lg:pb-6" : ""
        }`}
      >
        {children}
      </main>
      <MobileNavigation links={mobileLinks} />
    </div>
  )
}

"use client"

import type { ReactNode } from "react"
import { IconButton } from "../components/IconButton"
import { Link } from "../components/Link"
import { APP_NAVIGATION } from "./navigation.constants"
import { APP_ROUTES } from "./route.constants"
import { useAppShell } from "./useAppShell"

/** Frame app pages with a desktop rail and mobile bottom navigation. UI only. */
export function AppShell({ children }: { children: ReactNode }) {
  const { isNavigationActive, toggleTheme } = useAppShell()
  return <div className="app-layout">
    <aside className="app-rail hidden items-center py-5 md:flex md:flex-col" aria-label="Điều hướng chính">
      <Link href={APP_ROUTES.INBOX} aria-label="Linko, về tin nhắn" className="mb-8 grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand)] text-xl font-bold text-white shadow-[var(--shadow-brand)]">L</Link>
      <nav aria-label="Chính" className="grid gap-2">
        {APP_NAVIGATION.map((item) => <Link key={item.href} href={item.href} title={item.label} aria-current={isNavigationActive(item.href) ? "page" : undefined} className={`group relative grid h-12 w-12 place-items-center rounded-xl text-xl transition-colors ${isNavigationActive(item.href) ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"}`}><span aria-hidden="true">{item.symbol}</span><span className="sr-only">{item.label}</span></Link>)}
      </nav>
      <div className="mt-auto"><IconButton label="Đổi giao diện sáng tối" icon="◐" onClick={toggleTheme} /></div>
    </aside>
    <div className="app-main">
      <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 sm:px-6 md:hidden">
        <Link href={APP_ROUTES.INBOX} aria-label="Linko, về tin nhắn" className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand)] text-lg font-bold text-white">L</Link>
        <IconButton label="Đổi giao diện sáng tối" icon="◐" onClick={toggleTheme} />
      </header>
      <main id="main-content" className="mx-auto w-full max-w-[1440px] min-w-0 px-4 py-6 pb-24 sm:px-6 md:px-8 md:py-8 md:pb-8">{children}</main>
    </div>
    <nav aria-label="Điều hướng di động" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
      {APP_NAVIGATION.map((item) => <Link key={item.href} href={item.href} aria-current={isNavigationActive(item.href) ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-none text-[0.6875rem] font-medium ${isNavigationActive(item.href) ? "text-[var(--brand)]" : "text-[var(--text-secondary)]"}`}><span aria-hidden="true" className="text-xl leading-none">{item.symbol}</span>{item.label}</Link>)}
    </nav>
  </div>
}

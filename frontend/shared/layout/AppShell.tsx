"use client"

import type { ReactNode } from "react"
import { IconButton } from "../components/IconButton"
import { Link } from "../components/Link"
import { APP_NAVIGATION } from "./navigation.constants"
import { useAppShell } from "./useAppShell"

/** Frame app pages with a desktop rail and mobile bottom navigation. UI only. */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname, toggleTheme } = useAppShell()
  return <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
    <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] px-4 py-6 md:flex md:flex-col" aria-label="Điều hướng chính">
      <Link href="/inbox" className="mb-10 px-3 text-2xl font-bold tracking-tight text-[var(--brand)]">linko<span className="text-[var(--text-primary)]">.</span></Link>
      <nav aria-label="Chính" className="grid gap-1">
        {APP_NAVIGATION.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-12 items-center gap-3 px-3 text-sm font-medium ${pathname === item.href ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--text-secondary)]"}`}><span aria-hidden="true" className="text-xl">{item.symbol}</span>{item.label}</Link>)}
      </nav>
      <div className="mt-auto px-2"><IconButton label="Đổi giao diện sáng tối" icon="◐" onClick={toggleTheme} /></div>
    </aside>
    <div className="min-w-0">
      <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 md:hidden">
        <Link href="/inbox" className="text-2xl font-bold tracking-tight text-[var(--brand)]">linko<span className="text-[var(--text-primary)]">.</span></Link>
        <IconButton label="Đổi giao diện sáng tối" icon="◐" onClick={toggleTheme} />
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl min-w-0 px-4 py-6 pb-24 sm:px-8 md:py-10 md:pb-10">{children}</main>
    </div>
    <nav aria-label="Điều hướng di động" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
      {APP_NAVIGATION.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-none text-xs font-medium ${pathname === item.href ? "text-[var(--brand)]" : "text-[var(--text-secondary)]"}`}><span aria-hidden="true" className="text-xl">{item.symbol}</span>{item.label}</Link>)}
    </nav>
  </div>
}

"use client"

import { Link } from "@/shared/components/Link"
import { useWelcomePage } from "../hooks/useWelcomePage"
import { WelcomeHero } from "../components/WelcomeHero"

/** Compose the public landing screen after session recovery completes. */
export function WelcomePage() {
  const { isReady } = useWelcomePage()
  if (!isReady) return <main aria-busy="true" className="min-h-dvh" />
  return <main className="grid min-h-dvh overflow-hidden px-5 py-8 sm:px-10"><header className="mx-auto flex w-full max-w-6xl items-center justify-between"><Link href="/" className="text-2xl font-bold tracking-tight text-[var(--brand)]">linko<span className="text-[var(--text-primary)]">.</span></Link><Link href="/login">Đăng nhập</Link></header><WelcomeHero /><footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-[var(--border)] py-5 text-sm text-[var(--text-secondary)]"><span>Riêng tư theo mặc định. Gần gũi mỗi ngày.</span><span>© Linko</span></footer></main>
}

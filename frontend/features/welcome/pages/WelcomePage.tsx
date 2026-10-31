"use client"

import Image from "next/image"
import { Link } from "@/shared/components/Link"
import { useWelcomePage } from "../hooks/useWelcomePage"
import { WelcomeHero } from "../components/WelcomeHero"

/** Compose the public landing screen after session recovery completes. */
export function WelcomePage() {
  const { isReady } = useWelcomePage()
  if (!isReady) return <main aria-busy="true" className="min-h-dvh" />
  return (
    <main className="grid min-h-dvh overflow-hidden px-5 py-8 sm:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-2xl font-bold tracking-tight text-brand"
        >
          <Image
            src="/logo.png"
            alt="Linko"
            width={32}
            height={32}
            className="rounded-xl object-contain drop-shadow-xs"
            priority
          />
          <span>
            linko<span className="text-text-primary">.</span>
          </span>
        </Link>
        <Link href="/login">Đăng nhập</Link>
      </header>
      <WelcomeHero />
      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between border-t border-border py-5 text-sm text-text-secondary">
        <span>Riêng tư theo mặc định. Gần gũi mỗi ngày.</span>
        <span>© Linko</span>
      </footer>
    </main>
  )
}

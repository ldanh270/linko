"use client"

import Image from "next/image"
import { Link } from "../components/Link"
import { useI18n } from "../i18n/useI18n"
import { NavigationItem, type NavigationItemProps } from "./NavigationItem"
import { APP_ROUTES } from "./route.constants"
import type { ReactNode } from "react"

/** Desktop navigation props keep account fetching outside shared components. */
export interface NavigationRailProps {
  readonly links: readonly NavigationItemProps[]
  readonly account: ReactNode
  readonly utilityAction?: ReactNode
}

/** Render the 75px reference rail with centered destinations and bottom account/preference actions. UI only. */
export function NavigationRail({
  links,
  account,
  utilityAction,
}: NavigationRailProps) {
  const { copy } = useI18n()

  return (
    <aside
      className="hidden lg:flex flex-col items-center h-full bg-surface border-r border-border"
      aria-label="Điều hướng chính"
    >
      {/* Brand logo */}
      <Link
        href={APP_ROUTES.INBOX}
        aria-label={copy.navigation.brandLogo}
        className="mt-4 inline-flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <Image
          src="/logo.png"
          alt="Linko"
          width={40}
          height={40}
          className="rounded-xl object-contain drop-shadow-xs"
          priority
        />
      </Link>

      {/* Navigation links */}
      <nav aria-label="Chính" className="my-auto grid gap-4">
        {links.map((item) => (
          <NavigationItem key={item.destination} {...item} />
        ))}
      </nav>

      {/* Account and preferences */}
      <div className="grid place-items-center gap-3 pb-4">
        {utilityAction}
        {account}
      </div>
    </aside>
  )
}

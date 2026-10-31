"use client"

import Image from "next/image"
import { Link } from "../components/Link"
import { IconButton } from "../components/IconButton"
import { Icon } from "../icons/Icon"
import { ICON_NAMES } from "../icons/icon.constants"
import { useI18n } from "../i18n/useI18n"
import type { AppLanguage } from "../i18n/i18n.types"
import { NavigationItem, type NavigationItemProps } from "./NavigationItem"
import { APP_ROUTES } from "./route.constants"
import type { ReactNode } from "react"

/** Desktop navigation props keep account fetching outside shared components. */
export interface NavigationRailProps {
  readonly links: readonly NavigationItemProps[]
  readonly onToggleTheme: () => void
  readonly onToggleLanguage?: () => void
  readonly language?: AppLanguage
  readonly account: ReactNode
}

/** Render the 75px reference rail with centered destinations and bottom account/preference actions. UI only. */
export function NavigationRail({
  links,
  onToggleTheme,
  onToggleLanguage,
  language,
  account,
}: NavigationRailProps) {
  const { copy } = useI18n()

  return (
    <aside
      className="hidden lg:flex flex-col items-center h-dvh bg-[var(--surface)] border-r border-[var(--border)]"
      aria-label="Điều hướng chính"
    >
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
      <nav aria-label="Chính" className="my-auto grid gap-4">
        {links.map((item) => (
          <NavigationItem key={item.destination} {...item} />
        ))}
      </nav>
      <div className="grid place-items-center gap-3 pb-4">
        {onToggleLanguage && (
          <button
            type="button"
            onClick={onToggleLanguage}
            aria-label={copy.navigation.toggleLanguage}
            title={language === "vi" ? "Switch to English (EN)" : "Chuyển sang Tiếng Việt (VI)"}
            className="flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold transition-all border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] cursor-pointer"
          >
            {language?.toUpperCase() ?? "VI"}
          </button>
        )}
        <IconButton label={copy.navigation.toggleTheme} icon={<Icon name={ICON_NAMES.MOON} />} onClick={onToggleTheme} />
        {account}
      </div>
    </aside>
  )
}

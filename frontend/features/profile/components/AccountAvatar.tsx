"use client"

import { usePathname } from "next/navigation"
import { Link } from "@/shared/components/Link"
import { Avatar } from "@/shared/components/Avatar"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { useAccountAvatar } from "../hooks/useAccountAvatar"

/** Render a feature-owned account shortcut supplied to the domain-neutral shell. UI only. */
export function AccountAvatar() {
  const state = useAccountAvatar()
  const pathname = usePathname()
  const isActive = pathname === APP_ROUTES.PROFILE

  return (
    <Link
      href={state.href}
      aria-label="Hồ sơ tài khoản"
      className={`rail-account-link ${isActive ? "is-active" : ""}`}
    >
      <Avatar label={state.name} src={state.avatarUrl} size="small" />
    </Link>
  )
}

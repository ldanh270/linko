"use client"

import { Link } from "@/shared/components/Link"
import { Avatar } from "@/shared/components/Avatar"
import { useAccountAvatar } from "../hooks/useAccountAvatar"

/** Render a feature-owned account shortcut supplied to the domain-neutral shell. UI only. */
export function AccountAvatar() {
  const state = useAccountAvatar()
  return <Link href={state.href} aria-label="Hồ sơ tài khoản"><Avatar label={state.name} src={state.avatarUrl} size="small" /></Link>
}

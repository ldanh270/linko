"use client"

import { Link } from "../components/Link"
import { IconButton } from "../components/IconButton"
import { Icon } from "../icons/Icon"
import { ICON_NAMES } from "../icons/icon.constants"
import { NavigationItem, type NavigationItemProps } from "./NavigationItem"
import { APP_ROUTES } from "./route.constants"
import type { ReactNode } from "react"

/** Desktop navigation props keep account fetching outside shared components. */
export interface NavigationRailProps { readonly links: readonly NavigationItemProps[]; readonly onToggleTheme: () => void; readonly account: ReactNode }

/** Render the 75px reference rail with centered destinations and bottom account actions. UI only. */
export function NavigationRail({ links, onToggleTheme, account }: NavigationRailProps) {
  return <aside className="app-rail" aria-label="Điều hướng chính">
    <Link href={APP_ROUTES.INBOX} aria-label="Linko, về tin nhắn" className="rail-logo"><Icon name={ICON_NAMES.BRAND} /></Link>
    <nav aria-label="Chính" className="rail-items">{links.map((item) => <NavigationItem key={item.destination} {...item} />)}</nav>
    <div className="rail-footer"><IconButton label="Đổi giao diện sáng tối" icon={<Icon name={ICON_NAMES.MOON} />} onClick={onToggleTheme} />{account}</div>
  </aside>
}

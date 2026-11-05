import { NavigationItem, type NavigationItemProps } from "./NavigationItem"
import type { ReactNode } from "react"

/** Mobile destinations prepared by the workspace navigation hook. */
export interface MobileNavigationProps { readonly links: readonly NavigationItemProps[]; readonly utilityAction?: ReactNode }

/** Render the reference's compact bottom navigation. UI only. */
export function MobileNavigation({ links, utilityAction }: MobileNavigationProps) {
  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed bottom-0 inset-x-0 z-40 flex lg:hidden justify-around px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-surface border-t border-border"
    >
      {links.map((item) => (
        <NavigationItem key={item.destination} {...item} />
      ))}
      {utilityAction}
    </nav>
  )
}

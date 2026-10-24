import { NavigationItem, type NavigationItemProps } from "./NavigationItem"

/** Mobile destinations prepared by the workspace navigation hook. */
export interface MobileNavigationProps { readonly links: readonly NavigationItemProps[] }

/** Render the reference's compact bottom navigation. UI only. */
export function MobileNavigation({ links }: MobileNavigationProps) {
  return <nav aria-label="Điều hướng di động" className="mobile-navigation">{links.map((item) => <NavigationItem key={item.destination} {...item} />)}</nav>
}

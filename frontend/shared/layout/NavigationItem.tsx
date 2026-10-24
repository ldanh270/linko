import { Link } from "../components/Link"
import { Icon } from "../icons/Icon"
import type { IconName } from "../icons/icon.constants"

/** Prepared navigation item shared by desktop and mobile. */
export interface NavigationItemProps { readonly label: string; readonly destination: string; readonly icon: IconName; readonly isActive: boolean }

/** Render one labelled destination with a shared selected state. UI only. */
export function NavigationItem({ label, destination, icon, isActive }: NavigationItemProps) {
  return <Link href={destination} title={label} aria-label={label} aria-current={isActive ? "page" : undefined} className="rail-link"><Icon name={icon} /></Link>
}

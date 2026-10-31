import { Link } from "../components/Link"
import { Icon } from "../icons/Icon"
import type { IconName } from "../icons/icon.constants"

/** Prepared navigation item shared by desktop and mobile. */
export interface NavigationItemProps { readonly label: string; readonly destination: string; readonly icon: IconName; readonly isActive: boolean }

/** Render one labelled destination with a shared selected state. UI only. */
export function NavigationItem({ label, destination, icon, isActive }: NavigationItemProps) {
  return (
    <Link
      href={destination}
      title={label}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={`grid place-items-center w-13 h-13 rounded-lg text-2xl transition-colors ${
        isActive
          ? "text-brand bg-brand-soft"
          : "text-text-secondary hover:text-brand hover:bg-brand-subtle"
      }`}
    >
      <Icon name={icon} />
    </Link>
  )
}

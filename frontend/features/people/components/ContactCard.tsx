import { Avatar } from "@/shared/components/Avatar"
import { Button } from "@/shared/components/Button"
import { DropdownMenu, type DropdownAction } from "@/shared/components/DropdownMenu/DropdownMenu"
import { Link } from "@/shared/components/Link"
import { PresenceIndicator } from "@/shared/components/PresenceIndicator"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"

export interface ContactCardItem {
  readonly id: string
  readonly name: string
  readonly isOpening: boolean
  readonly onOpen: () => void
  readonly menu: readonly DropdownAction[]
}

export interface ContactCardProps {
  readonly contact: ContactCardItem
  readonly isOnline: boolean
}

/** Render a single contact item in the directory with status indicator and quick actions. UI only. */
export function ContactCard({ contact, isOnline }: ContactCardProps) {
  return (
    <article className="border border-[var(--border)] rounded-[var(--radius-panel)] bg-[var(--surface)] shadow-[var(--shadow-panel)] flex items-center justify-between gap-3 p-3.5 transition-shadow hover:shadow-md">
      <Link
        href={buildAppRoute(APP_ROUTES.USER_PROFILE, { userId: contact.id })}
        className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-opacity"
        title={`Xem hồ sơ của ${contact.name}`}
      >
        <Avatar label={contact.name} size="medium" isOnline={isOnline} />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate" title={contact.name}>
            {contact.name}
          </p>
          <PresenceIndicator
            isOnline={isOnline}
            variant="text"
            size="sm"
            labelOnline="Trực tuyến"
            labelOffline="Ngoại tuyến"
          />
        </div>
      </Link>

      <div className="flex items-center gap-1.5 flex-none">
        <Button
          size="small"
          variant="secondary"
          disabled={contact.isOpening}
          onClick={contact.onOpen}
          title="Nhắn tin"
        >
          <Icon name={ICON_NAMES.CHAT} />
        </Button>
        <DropdownMenu label={`Tùy chọn ${contact.name}`} items={contact.menu} />
      </div>
    </article>
  )
}

"use client"

import { Avatar } from "@/shared/components/Avatar"
import { PresenceIndicator } from "@/shared/components/PresenceIndicator"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES, type IconName } from "@/shared/icons/icon.constants"
import { usePresence } from "@/shared/presence/usePresence"
import { CHAT_DETAILS_COPY, CHAT_KIND } from "../../chat.constants"
import type { ConversationDetailsViewModel } from "../../chat.types"

export interface ConversationDetailsIdentityProps {
  readonly details: ConversationDetailsViewModel
}

interface QuickActionItemProps {
  readonly icon: IconName
  readonly label: string
  readonly onClick?: () => void
  readonly href?: string
  readonly disabled?: boolean
}

/** Render a single circular Messenger-style quick action button or link. */
function QuickActionItem({ icon, label, onClick, href, disabled }: QuickActionItemProps) {
  const content = (
    <>
      <span className="grid place-items-center w-[38px] h-[38px] rounded-full bg-input-surface text-text-primary text-[18px] transition-all group-hover:bg-input-surface-hover group-hover:scale-105 active:scale-95">
        <Icon name={icon} />
      </span>
      <span className="text-xs text-text-secondary">{label}</span>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="group flex flex-col items-center gap-1.5 text-xs text-text-primary cursor-pointer no-underline"
        aria-label={label}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      className="group flex flex-col items-center gap-1.5 text-xs text-text-primary cursor-pointer bg-transparent border-none disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {content}
    </button>
  )
}

/**
 * Render conversation header identity, avatar with online presence,
 * and Messenger-style circular quick action buttons. UI presentation only.
 */
export function ConversationDetailsIdentity({ details }: ConversationDetailsIdentityProps) {
  const isGroup = details.kind === CHAT_KIND.GROUP
  const presence = usePresence(details.peerId ? [details.peerId] : [])
  const isPeerOnline = details.peerId ? presence.isOnline(details.peerId) : undefined

  return (
    <div className="flex flex-col items-center text-center py-2.5">
      {details.profileHref ? (
        <Link
          href={details.profileHref}
          className="hover:opacity-85 transition-opacity inline-block mb-3"
          title="Xem trang cá nhân"
        >
          <Avatar label={details.title} src={details.avatarUrl} size="large" isOnline={isPeerOnline} />
        </Link>
      ) : (
        <div className="mb-3">
          <Avatar label={details.title} src={details.avatarUrl} size="large" isOnline={isPeerOnline} />
        </div>
      )}

      <h3 className="text-lg font-semibold text-text-primary mb-1">
        {details.profileHref ? (
          <Link href={details.profileHref} className="hover:underline">
            {details.title}
          </Link>
        ) : (
          details.title
        )}
      </h3>

      {isPeerOnline !== undefined ? (
        <div className="flex items-center justify-center gap-1.5 text-xs mb-4">
          <PresenceIndicator
            isOnline={isPeerOnline}
            variant="text"
            labelOnline="Đang hoạt động"
            labelOffline="Ngoại tuyến"
          />
          <span className="text-text-muted">·</span>
          <span className="text-text-secondary">{details.subtitle}</span>
        </div>
      ) : (
        <p className="text-sm text-text-secondary mb-4">{details.subtitle}</p>
      )}

      {/* Quick Action Buttons Row */}
      <div className="flex items-center justify-center gap-4 w-full">
        {details.invitationsHref && (
          <QuickActionItem
            icon={ICON_NAMES.ADD_CONTACT}
            label={CHAT_DETAILS_COPY.ADD_MEMBER}
            href={details.invitationsHref}
          />
        )}

        {!details.invitationsHref && details.profileHref && (
          <QuickActionItem
            icon={ICON_NAMES.PROFILE}
            label={CHAT_DETAILS_COPY.PROFILE}
            href={details.profileHref}
          />
        )}

        <QuickActionItem
          icon={ICON_NAMES.SEARCH}
          label={CHAT_DETAILS_COPY.SEARCH}
          onClick={details.onOpenSearch}
        />

        {isGroup && (
          <QuickActionItem
            icon={details.isMuted ? ICON_NAMES.SUN : ICON_NAMES.MOON}
            label={details.isMuted ? CHAT_DETAILS_COPY.UNMUTE : CHAT_DETAILS_COPY.MUTE}
            onClick={details.onToggleMute}
            disabled={details.isMuteLoading}
          />
        )}
      </div>
    </div>
  )
}

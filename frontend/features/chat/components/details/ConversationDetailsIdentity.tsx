import { Avatar } from "@/shared/components/Avatar"
import { IconButton } from "@/shared/components/IconButton"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { usePresence } from "@/shared/presence/usePresence"
import { CHAT_DETAILS_COPY, CHAT_KIND } from "../../chat.constants"
import type { ConversationDetailsViewModel } from "../../chat.types"

export interface ConversationDetailsIdentityProps {
  readonly details: ConversationDetailsViewModel
}

/** Render conversation header identity and Messenger-style quick action buttons. UI only. */
export function ConversationDetailsIdentity({ details }: ConversationDetailsIdentityProps) {
  const isGroup = details.kind === CHAT_KIND.GROUP
  const presence = usePresence(details.peerId ? [details.peerId] : [])
  const isPeerOnline = details.peerId ? presence.isOnline(details.peerId) : undefined

  return (
    <div className="flex flex-col items-center text-center py-2.5">
      {details.profileHref ? (
        <Link href={details.profileHref} className="hover:opacity-85 transition-opacity inline-block mb-3" title="Xem trang cá nhân">
          <Avatar label={details.title} src={details.avatarUrl} size="large" isOnline={isPeerOnline} />
        </Link>
      ) : (
        <div className="mb-3">
          <Avatar label={details.title} src={details.avatarUrl} size="large" isOnline={isPeerOnline} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
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
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isPeerOnline
                ? "bg-[var(--status-online)] shadow-[0_0_6px_var(--status-online-glow)]"
                : "bg-[var(--status-offline)]"
            }`}
            aria-hidden="true"
          />
          <span className={isPeerOnline ? "text-[var(--status-online)] font-semibold" : "text-[var(--text-secondary)] font-medium"}>
            {isPeerOnline ? "Đang hoạt động" : "Ngoại tuyến"}
          </span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-secondary)]">{details.subtitle}</span>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-secondary)] mb-4">{details.subtitle}</p>
      )}

      <div className="flex items-center justify-center gap-4 w-full">
        {details.invitationsHref ? (
          <Link
            href={details.invitationsHref}
            className="group flex flex-col items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer no-underline"
            aria-label={CHAT_DETAILS_COPY.ADD_MEMBER}
          >
            <span className="grid place-items-center w-[38px] h-[38px] rounded-full bg-[var(--input-surface)] text-[var(--text-primary)] text-[18px] transition-all group-hover:bg-[var(--input-surface-hover)] group-hover:scale-105 active:scale-95">
              <Icon name={ICON_NAMES.ADD_CONTACT} />
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{CHAT_DETAILS_COPY.ADD_MEMBER}</span>
          </Link>
        ) : details.profileHref ? (
          <Link
            href={details.profileHref}
            className="group flex flex-col items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer no-underline"
            aria-label={CHAT_DETAILS_COPY.PROFILE}
          >
            <span className="grid place-items-center w-[38px] h-[38px] rounded-full bg-[var(--input-surface)] text-[var(--text-primary)] text-[18px] transition-all group-hover:bg-[var(--input-surface-hover)] group-hover:scale-105 active:scale-95">
              <Icon name={ICON_NAMES.PROFILE} />
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{CHAT_DETAILS_COPY.PROFILE}</span>
          </Link>
        ) : null}

        <button
          type="button"
          className="group flex flex-col items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer bg-transparent border-none"
          onClick={details.onOpenSearch}
          aria-label={CHAT_DETAILS_COPY.SEARCH}
        >
          <span className="grid place-items-center w-[38px] h-[38px] rounded-full bg-[var(--input-surface)] text-[var(--text-primary)] text-[18px] transition-all group-hover:bg-[var(--input-surface-hover)] group-hover:scale-105 active:scale-95">
            <Icon name={ICON_NAMES.SEARCH} />
          </span>
          <span className="text-xs text-[var(--text-secondary)]">{CHAT_DETAILS_COPY.SEARCH}</span>
        </button>

        {isGroup && (
          <button
            type="button"
            className="group flex flex-col items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer bg-transparent border-none"
            onClick={details.onToggleMute}
            disabled={details.isMuteLoading}
            aria-label={details.isMuted ? CHAT_DETAILS_COPY.UNMUTE : CHAT_DETAILS_COPY.MUTE}
          >
            <span className="grid place-items-center w-[38px] h-[38px] rounded-full bg-[var(--input-surface)] text-[var(--text-primary)] text-[18px] transition-all group-hover:bg-[var(--input-surface-hover)] group-hover:scale-105 active:scale-95">
              <Icon name={details.isMuted ? ICON_NAMES.SUN : ICON_NAMES.MOON} />
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              {details.isMuted ? CHAT_DETAILS_COPY.UNMUTE : CHAT_DETAILS_COPY.MUTE}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

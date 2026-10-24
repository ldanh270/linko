import { Avatar } from "@/shared/components/Avatar"
import { IconButton } from "@/shared/components/IconButton"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { CHAT_DETAILS_COPY, CHAT_KIND } from "../../chat.constants"
import type { ConversationDetailsViewModel } from "../../chat.types"

export interface ConversationDetailsIdentityProps {
  readonly details: ConversationDetailsViewModel
}

/** Render conversation header identity and Messenger-style quick action buttons. UI only. */
export function ConversationDetailsIdentity({ details }: ConversationDetailsIdentityProps) {
  const isGroup = details.kind === CHAT_KIND.GROUP
  return (
    <div className="conversation-details-identity">
      <Avatar label={details.title} src={details.avatarUrl} size="large" />
      <h3 className="conversation-details-title">{details.title}</h3>
      <p className="conversation-details-subtitle">{details.subtitle}</p>

      <div className="conversation-details-quick-actions">
        {details.invitationsHref ? (
          <Link
            href={details.invitationsHref}
            className="details-quick-action"
            aria-label={CHAT_DETAILS_COPY.ADD_MEMBER}
          >
            <span className="details-quick-action-icon">
              <Icon name={ICON_NAMES.ADD_CONTACT} />
            </span>
            <span className="details-quick-action-label">{CHAT_DETAILS_COPY.ADD_MEMBER}</span>
          </Link>
        ) : (
          <Link
            href={APP_ROUTES.PEOPLE}
            className="details-quick-action"
            aria-label={CHAT_DETAILS_COPY.PROFILE}
          >
            <span className="details-quick-action-icon">
              <Icon name={ICON_NAMES.PROFILE} />
            </span>
            <span className="details-quick-action-label">{CHAT_DETAILS_COPY.PROFILE}</span>
          </Link>
        )}

        <button
          type="button"
          className="details-quick-action"
          onClick={details.onOpenSearch}
          aria-label={CHAT_DETAILS_COPY.SEARCH}
        >
          <span className="details-quick-action-icon">
            <Icon name={ICON_NAMES.SEARCH} />
          </span>
          <span className="details-quick-action-label">{CHAT_DETAILS_COPY.SEARCH}</span>
        </button>

        {isGroup && (
          <button
            type="button"
            className="details-quick-action"
            onClick={details.onToggleMute}
            disabled={details.isMuteLoading}
            aria-label={details.isMuted ? CHAT_DETAILS_COPY.UNMUTE : CHAT_DETAILS_COPY.MUTE}
          >
            <span className="details-quick-action-icon">
              <Icon name={details.isMuted ? ICON_NAMES.SUN : ICON_NAMES.MOON} />
            </span>
            <span className="details-quick-action-label">
              {details.isMuted ? CHAT_DETAILS_COPY.UNMUTE : CHAT_DETAILS_COPY.MUTE}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

import { Button } from "@/shared/components/Button"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { CHAT_DETAILS_COPY, CHAT_KIND } from "../../chat.constants"
import type { ConversationDetailsViewModel } from "../../chat.types"

export interface ConversationDetailsActionsProps {
  readonly details: ConversationDetailsViewModel
}

/** Render group settings links and leave action in privacy & support section. UI only. */
export function ConversationDetailsActions({ details }: ConversationDetailsActionsProps) {
  const isGroup = details.kind === CHAT_KIND.GROUP
  return (
    <div className="details-actions-section">
      {details.manageHref && (
        <Link href={details.manageHref} className="details-action-link">
          <Icon name={ICON_NAMES.SETTINGS} />
          <span>{CHAT_DETAILS_COPY.MANAGE_GROUP}</span>
        </Link>
      )}

      {isGroup && (
        <div className="details-danger-zone">
          <Button
            variant="danger"
            isLoading={details.isLeaving}
            onClick={details.onLeaveGroup}
            className="w-full justify-center"
          >
            <Icon name={ICON_NAMES.LOGOUT} />
            {CHAT_DETAILS_COPY.LEAVE_GROUP}
          </Button>
        </div>
      )}
    </div>
  )
}

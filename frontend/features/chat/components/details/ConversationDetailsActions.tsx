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
    <div className="flex flex-col gap-3">
      {details.manageHref && (
        <Link
          href={details.manageHref}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-text-primary text-[13px] hover:bg-surface-subtle transition-colors"
        >
          <Icon name={ICON_NAMES.SETTINGS} />
          <span>{CHAT_DETAILS_COPY.MANAGE_GROUP}</span>
        </Link>
      )}

      {isGroup && (
        <div className="mt-1 pt-3 border-t border-border">
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

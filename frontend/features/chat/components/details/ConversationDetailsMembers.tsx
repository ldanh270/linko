import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { CHAT_DETAILS_COPY } from "../../chat.constants"
import type { ConversationMemberViewModel } from "../../chat.types"

export interface ConversationDetailsMembersProps {
  readonly members: readonly ConversationMemberViewModel[]
  readonly invitationsHref: string | null
}

/** Render conversation members list with avatars, roles, and invite action. UI only. */
export function ConversationDetailsMembers({ members, invitationsHref }: ConversationDetailsMembersProps) {
  return (
    <div className="details-members-section">
      {invitationsHref && (
        <div className="details-invite-row">
          <Link href={invitationsHref} className="details-invite-button">
            <span className="details-invite-icon">
              <Icon name={ICON_NAMES.ADD} />
            </span>
            <span>{CHAT_DETAILS_COPY.ADD_MEMBER}</span>
          </Link>
        </div>
      )}
      <ul className="details-members-list">
        {members.map((member) => (
          <li key={member.id} className="details-member-item">
            <Avatar label={member.name} src={member.avatarUrl} size="small" />
            <div className="details-member-info">
              <span className="details-member-name">{member.name}</span>
              <span className="details-member-role">{member.roleLabel}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

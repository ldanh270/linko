import { Avatar } from "@/shared/components/Avatar"
import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { CHAT_DETAILS_COPY } from "../../chat.constants"
import type { ConversationMemberViewModel } from "../../chat.types"

export interface ConversationDetailsMembersProps {
  readonly members: readonly ConversationMemberViewModel[]
  readonly invitationsHref: string | null
}

/** Render conversation members list with avatars, roles, and invite action. UI only. */
export function ConversationDetailsMembers({ members, invitationsHref }: ConversationDetailsMembersProps) {
  return (
    <div className="flex flex-col gap-2">
      {invitationsHref && (
        <div className="mb-1.5">
          <Link
            href={invitationsHref}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[var(--brand)] no-underline text-[13px] font-medium hover:bg-[var(--brand-soft)] transition-colors"
          >
            <span className="grid place-items-center w-7 h-7 rounded-full bg-[var(--brand-soft)] text-[16px]">
              <Icon name={ICON_NAMES.ADD} />
            </span>
            <span>{CHAT_DETAILS_COPY.ADD_MEMBER}</span>
          </Link>
        </div>
      )}
      <ul className="flex flex-col gap-1 list-none p-0 m-0">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[var(--surface-subtle)] transition-colors">
            <Link
              href={buildAppRoute(APP_ROUTES.USER_PROFILE, { userId: member.id })}
              className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition-opacity"
              title={`Xem hồ sơ của ${member.name}`}
            >
              <Avatar label={member.name} src={member.avatarUrl} size="small" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">{member.name}</span>
                <span className="text-[11px] text-[var(--text-secondary)]">{member.roleLabel}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

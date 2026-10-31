import { Accordion } from "@/shared/components/Accordion"
import { IconButton } from "@/shared/components/IconButton"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import {
  CHAT_DETAILS_COPY,
  CHAT_DETAILS_SECTIONS,
  CHAT_KIND,
} from "../../chat.constants"
import type { ConversationDetailsViewModel } from "../../chat.types"
import { ConversationDetailsIdentity } from "./ConversationDetailsIdentity"
import { ConversationDetailsMembers } from "./ConversationDetailsMembers"
import { ConversationDetailsMedia } from "./ConversationDetailsMedia"
import { ConversationDetailsPins } from "./ConversationDetailsPins"
import { ConversationDetailsActions } from "./ConversationDetailsActions"

export interface ConversationDetailsSheetProps {
  readonly details: ConversationDetailsViewModel
  readonly onClose: () => void
}

/** Render the complete Messenger-style conversation details right-side sheet. UI only. */
export function ConversationDetailsSheet({ details, onClose }: ConversationDetailsSheetProps) {
  const isGroup = details.kind === CHAT_KIND.GROUP
  return (
    <aside
      className="w-[var(--details-width)] border-l border-border bg-surface flex flex-col h-full min-h-0"
      aria-label={CHAT_DETAILS_COPY.SHEET_TITLE}
    >
      <header className="flex min-h-[var(--header-height)] items-center justify-between px-4 py-3.5 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary">{CHAT_DETAILS_COPY.SHEET_TITLE}</h2>
        <IconButton
          label={CHAT_DETAILS_COPY.CLOSE}
          icon={<Icon name={ICON_NAMES.CLOSE} />}
          onClick={onClose}
        />
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#a2adb755_transparent] p-4 flex flex-col gap-4">
        <ConversationDetailsIdentity details={details} />

        {details.description && (
          <div className="p-3 rounded-md bg-surface-subtle text-sm text-text-secondary leading-normal">
            <p>{details.description}</p>
          </div>
        )}

        <div className="flex flex-col">
          <Accordion
            id="details-members"
            title={CHAT_DETAILS_COPY.SECTION_MEMBERS}
            icon={ICON_NAMES.GROUP}
            isOpen={details.section === CHAT_DETAILS_SECTIONS.MEMBERS}
            onToggle={() => details.onToggleSection(CHAT_DETAILS_SECTIONS.MEMBERS)}
          >
            <ConversationDetailsMembers
              members={details.members}
              invitationsHref={details.invitationsHref}
            />
          </Accordion>

          <Accordion
            id="details-media"
            title={CHAT_DETAILS_COPY.SECTION_MEDIA}
            icon={ICON_NAMES.IMAGE}
            isOpen={details.section === CHAT_DETAILS_SECTIONS.MEDIA}
            onToggle={() => details.onToggleSection(CHAT_DETAILS_SECTIONS.MEDIA)}
          >
            <ConversationDetailsMedia photos={details.photos} files={details.files} />
          </Accordion>

          {isGroup && (
            <Accordion
              id="details-pins"
              title={CHAT_DETAILS_COPY.SECTION_PINS}
              icon={ICON_NAMES.PIN}
              isOpen={details.section === CHAT_DETAILS_SECTIONS.PINS}
              onToggle={() => details.onToggleSection(CHAT_DETAILS_SECTIONS.PINS)}
            >
              <ConversationDetailsPins pins={details.pins} />
            </Accordion>
          )}

          {isGroup && (
            <Accordion
              id="details-privacy"
              title={CHAT_DETAILS_COPY.SECTION_PRIVACY}
              icon={ICON_NAMES.SECURITY}
              isOpen={details.section === CHAT_DETAILS_SECTIONS.PRIVACY}
              onToggle={() => details.onToggleSection(CHAT_DETAILS_SECTIONS.PRIVACY)}
            >
              <ConversationDetailsActions details={details} />
            </Accordion>
          )}
        </div>
      </div>
    </aside>
  )
}

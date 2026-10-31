import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { CHAT_DETAILS_COPY } from "../../chat.constants"
import type { ConversationPinViewModel } from "../../chat.types"

export interface ConversationDetailsPinsProps {
  readonly pins: readonly ConversationPinViewModel[]
}

/** Render pinned group messages inside the details accordion. UI only. */
export function ConversationDetailsPins({ pins }: ConversationDetailsPinsProps) {
  if (pins.length === 0) {
    return <p className="text-[13px] text-text-secondary text-center py-3 m-0">{CHAT_DETAILS_COPY.NO_PINS}</p>
  }

  return (
    <ul className="flex flex-col gap-2 list-none p-0 m-0">
      {pins.map((pin) => (
        <li key={pin.id} className="p-2.5 rounded-md bg-surface-subtle border-l-2 border-brand">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-brand">
              <Icon name={ICON_NAMES.PIN} />
              {pin.author}
            </span>
            <time className="text-[11px] text-text-secondary">{pin.createdAt}</time>
          </div>
          <p className="text-xs text-text-primary m-0 truncate">{pin.content}</p>
        </li>
      ))}
    </ul>
  )
}

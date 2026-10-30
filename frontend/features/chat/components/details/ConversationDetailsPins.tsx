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
    return <p className="details-empty-notice">{CHAT_DETAILS_COPY.NO_PINS}</p>
  }

  return (
    <ul className="details-pins-list">
      {pins.map((pin) => (
        <li key={pin.id} className="details-pin-item">
          <div className="details-pin-header">
            <span className="details-pin-author">
              <Icon name={ICON_NAMES.PIN} />
              {pin.author}
            </span>
            <time className="details-pin-time">{pin.createdAt}</time>
          </div>
          <p className="details-pin-content">{pin.content}</p>
        </li>
      ))}
    </ul>
  )
}

import type { ConversationRowViewModel } from "../inbox.types"
import { ConversationListRow } from "./ConversationListRow"

/** Prepared conversation rows and optional active selection. */
export interface ConversationListProps {
  readonly rows: readonly ConversationRowViewModel[]
  readonly activeConversationId?: string
  readonly isOnline?: (peerId?: string | null) => boolean
}

/** Render the shared compact inbox list. UI only. */
export function ConversationList({ rows, activeConversationId, isOnline }: ConversationListProps) {
  return (
    <ul className="conversation-list">
      {rows.map((row) => (
        <ConversationListRow
          key={row.id}
          row={row}
          isActive={row.id === activeConversationId}
          isOnline={isOnline ? isOnline(row.peerId) : undefined}
        />
      ))}
    </ul>
  )
}

import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Render an intentional blank-chat state until a real conversation is selected. UI only. */
export function ConversationEmptyState() {
  return <div className="empty-conversation"><Icon name={ICON_NAMES.CHAT} /><h2>Chào mừng đến với Linko</h2><p>Chọn một cuộc trò chuyện để bắt đầu kết nối.</p></div>
}

import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Render an intentional blank-chat state until a real conversation is selected. UI only. */
export function ConversationEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-4 text-text-secondary">
      <Icon name={ICON_NAMES.CHAT} className="text-5xl text-brand flex-none" />
      <h2 className="text-2xl font-semibold text-text-primary">Chào mừng đến với Linko</h2>
      <p className="text-sm text-text-secondary">Chọn một cuộc trò chuyện để bắt đầu kết nối.</p>
    </div>
  )
}

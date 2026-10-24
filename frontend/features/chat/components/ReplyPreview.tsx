import { IconButton } from "@/shared/components/IconButton"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Reply indicator props keep cancellation behavior in the composer hook. */
export interface ReplyPreviewProps { readonly onCancel: () => void }

/** Render a compact, dismissible reply context. UI only. */
export function ReplyPreview({ onCancel }: ReplyPreviewProps) {
  return <div className="reply-preview"><span>Đang trả lời tin nhắn</span><IconButton label="Bỏ trả lời" icon={<Icon name={ICON_NAMES.CLOSE} />} onClick={onCancel} /></div>
}

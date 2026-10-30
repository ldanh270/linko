import { IconButton } from "@/shared/components/IconButton"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Reply indicator props keep cancellation behavior in the composer hook. */
export interface ReplyPreviewProps {
  readonly author?: string
  readonly content?: string
  readonly onCancel: () => void
}

/** Render a compact, dismissible reply context. UI only. */
export function ReplyPreview({ author, content, onCancel }: ReplyPreviewProps) {
  return (
    <div className="reply-preview">
      <div className="reply-preview-body">
        <span className="reply-preview-label">
          Đang trả lời <strong>{author || "tin nhắn"}</strong>
        </span>
        {content && <p className="reply-preview-content">{content}</p>}
      </div>
      <IconButton label="Bỏ trả lời" icon={<Icon name={ICON_NAMES.CLOSE} />} onClick={onCancel} />
    </div>
  )
}

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
    <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2.5 bg-brand-soft border-l-[3px] border-brand rounded-sm text-sm">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-xs text-text-secondary">
          Đang trả lời <strong className="text-brand font-semibold">{author || "tin nhắn"}</strong>
        </span>
        {content && <p className="text-sm text-text-primary truncate m-0">{content}</p>}
      </div>
      <IconButton label="Bỏ trả lời" icon={<Icon name={ICON_NAMES.CLOSE} />} onClick={onCancel} />
    </div>
  )
}

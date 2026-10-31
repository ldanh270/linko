"use client"

import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import type { AttachmentViewModel } from "../chat.types"
import { useMessageAttachment } from "../hooks/useMessageAttachment"
import { ImageLightbox } from "./ImageLightbox"

/** Prepared attachment display fields keep calculations outside JSX. */
export interface MessageAttachmentProps {
  readonly file: AttachmentViewModel
}

/** Render an image preview with a Facebook-style lightbox popup or a downloadable file. UI only. */
export function MessageAttachment({ file }: MessageAttachmentProps) {
  const {
    isImage,
    thumbnail,
    isLightboxOpen,
    onOpenLightbox,
    onCloseLightbox,
  } = useMessageAttachment({ file })

  if (isImage) {
    return (
      <>
        <button
          type="button"
          className="p-1 bg-transparent cursor-pointer border-none text-left font-inherit disabled:cursor-default disabled:opacity-70 group"
          onClick={onOpenLightbox}
          disabled={!thumbnail.objectUrl}
          aria-label={`Xem ảnh ${file.name}`}
        >
          {thumbnail.objectUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="block max-h-[180px] max-w-full w-auto rounded-md object-contain transition-all group-hover:opacity-95 group-hover:scale-[1.01]"
              src={thumbnail.objectUrl}
              alt={file.name}
            />
          ) : thumbnail.isLoading ? (
            <div className="flex items-center gap-2 min-w-[170px] max-w-full px-3 py-2 bg-surface text-text-secondary rounded-md border border-border-subtle text-xs">
              <Icon name={ICON_NAMES.IMAGE} />
              <span>Đang tải ảnh...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-[170px] max-w-full px-3 py-2 bg-surface text-text-secondary rounded-md border border-border-subtle text-xs">
              <Icon name={ICON_NAMES.IMAGE} />
              <span>{file.name}</span>
            </div>
          )}
        </button>

        {isLightboxOpen && thumbnail.objectUrl && (
          <ImageLightbox
            src={thumbnail.objectUrl}
            alt={file.name}
            name={file.name}
            onClose={onCloseLightbox}
          />
        )}
      </>
    )
  }

  return (
    <Link
      className="flex items-center gap-3 min-w-[170px] max-w-full px-3 py-2 bg-surface text-text-primary rounded-md mt-2 border border-border-subtle hover:border-border transition-colors text-left"
      href={file.href}
    >
      <span className="text-[28px] text-brand shrink-0" aria-hidden="true">
        <Icon name={ICON_NAMES.FILE} />
      </span>
      <span className="flex flex-col min-w-0 flex-1">
        <strong className="block text-sm font-medium [overflow-wrap:anywhere] truncate">{file.name}</strong>
        <small className="text-xs text-text-secondary">{file.sizeLabel}</small>
      </span>
      <span className="text-text-secondary shrink-0" aria-hidden="true">
        <Icon name={ICON_NAMES.DOWNLOAD} />
      </span>
    </Link>
  )
}

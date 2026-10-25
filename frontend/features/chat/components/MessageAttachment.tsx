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
          className="attachment-card attachment-card-image"
          onClick={onOpenLightbox}
          disabled={!thumbnail.objectUrl}
          aria-label={`Xem ảnh ${file.name}`}
        >
          {thumbnail.objectUrl ? (
            <img className="attachment-image" src={thumbnail.objectUrl} alt={file.name} />
          ) : thumbnail.isLoading ? (
            <div className="attachment-loading">
              <Icon name={ICON_NAMES.IMAGE} />
              <span>Đang tải ảnh...</span>
            </div>
          ) : (
            <div className="attachment-placeholder">
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
    <Link className="attachment-card" href={file.href}>
      <Icon name={ICON_NAMES.FILE} />
      <span>
        <strong>{file.name}</strong>
        <small>{file.sizeLabel}</small>
      </span>
      <Icon name={ICON_NAMES.DOWNLOAD} />
    </Link>
  )
}

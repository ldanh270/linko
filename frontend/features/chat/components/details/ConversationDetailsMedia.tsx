"use client"

import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { CHAT_DETAILS_COPY } from "../../chat.constants"
import type { AttachmentViewModel } from "../../chat.types"
import { useAttachmentThumbnail } from "../../hooks/useAttachmentThumbnail"
import { useConversationDetailsMedia } from "../../hooks/useConversationDetailsMedia"
import { ImageLightbox } from "../ImageLightbox"

export interface ConversationDetailsMediaProps {
  readonly photos: readonly AttachmentViewModel[]
  readonly files: readonly AttachmentViewModel[]
}

interface ConversationPhotoThumbProps {
  readonly photo: AttachmentViewModel
  readonly onSelect: (photo: AttachmentViewModel, objectUrl: string) => void
}

function ConversationPhotoThumb({ photo, onSelect }: ConversationPhotoThumbProps) {
  const isImage = Boolean(photo.imageUrl)
  const thumbnail = useAttachmentThumbnail({
    messageId: photo.messageId,
    attachmentId: photo.id,
    isImage,
  })

  return (
    <button
      type="button"
      className="aspect-square rounded-md overflow-hidden bg-[var(--input-surface)] block p-0 border-none cursor-pointer group disabled:cursor-default disabled:opacity-70"
      onClick={() => thumbnail.objectUrl && onSelect(photo, thumbnail.objectUrl)}
      disabled={!thumbnail.objectUrl}
      aria-label={`Xem ảnh ${photo.name}`}
    >
      {thumbnail.objectUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail.objectUrl}
          alt={photo.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      ) : (
        <div className="grid place-items-center w-full h-full text-[var(--text-secondary)] text-[20px]">
          <Icon name={ICON_NAMES.IMAGE} />
        </div>
      )}
    </button>
  )
}

/** Render shared images and file attachments from the conversation timeline. UI only. */
export function ConversationDetailsMedia({ photos, files }: ConversationDetailsMediaProps) {
  const { activePhoto, onSelectPhoto, onClosePhoto } = useConversationDetailsMedia()
  const hasPhotos = photos.length > 0
  const hasFiles = files.length > 0

  if (!hasPhotos && !hasFiles) {
    return <p className="text-[13px] text-[var(--text-secondary)] text-center py-3 m-0">{CHAT_DETAILS_COPY.NO_MEDIA}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {hasPhotos && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            {CHAT_DETAILS_COPY.PHOTOS}
          </h4>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((photo) => (
              <ConversationPhotoThumb
                key={photo.id}
                photo={photo}
                onSelect={onSelectPhoto}
              />
            ))}
          </div>
        </div>
      )}

      {hasFiles && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            {CHAT_DETAILS_COPY.FILES}
          </h4>
          <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
            {files.map((file) => (
              <li key={file.id} className="rounded-md transition-colors hover:bg-[var(--surface-subtle)]">
                <Link href={file.href} className="flex items-center gap-2.5 px-2.5 py-2 no-underline text-inherit" target="_blank">
                  <span className="grid place-items-center w-8 h-8 rounded-md bg-[var(--input-surface)] text-[var(--brand)] text-[18px] shrink-0">
                    <Icon name={ICON_NAMES.FILE} />
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">{file.name}</span>
                    {file.sizeLabel && <span className="text-[11px] text-[var(--text-secondary)]">{file.sizeLabel}</span>}
                  </div>
                  <Icon name={ICON_NAMES.DOWNLOAD} className="text-[16px] text-[var(--text-secondary)] shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activePhoto && (
        <ImageLightbox
          src={activePhoto.objectUrl}
          alt={activePhoto.photo.name}
          name={activePhoto.photo.name}
          onClose={onClosePhoto}
        />
      )}
    </div>
  )
}

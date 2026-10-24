import { Link } from "@/shared/components/Link"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { CHAT_DETAILS_COPY } from "../../chat.constants"
import type { AttachmentViewModel } from "../../chat.types"

export interface ConversationDetailsMediaProps {
  readonly photos: readonly AttachmentViewModel[]
  readonly files: readonly AttachmentViewModel[]
}

/** Render shared images and file attachments from the conversation timeline. UI only. */
export function ConversationDetailsMedia({ photos, files }: ConversationDetailsMediaProps) {
  const hasPhotos = photos.length > 0
  const hasFiles = files.length > 0

  if (!hasPhotos && !hasFiles) {
    return <p className="details-empty-notice">{CHAT_DETAILS_COPY.NO_MEDIA}</p>
  }

  return (
    <div className="details-media-section">
      {hasPhotos && (
        <div className="details-photos-block">
          <h4 className="details-subsection-title">{CHAT_DETAILS_COPY.PHOTOS}</h4>
          <div className="details-photos-grid">
            {photos.map((photo) => (
              <Link key={photo.id} href={photo.href} className="details-photo-thumb" target="_blank">
                {photo.imageUrl ? (
                  <img src={photo.imageUrl} alt={photo.name} loading="lazy" />
                ) : (
                  <div className="details-photo-placeholder">
                    <Icon name={ICON_NAMES.IMAGE} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {hasFiles && (
        <div className="details-files-block">
          <h4 className="details-subsection-title">{CHAT_DETAILS_COPY.FILES}</h4>
          <ul className="details-files-list">
            {files.map((file) => (
              <li key={file.id} className="details-file-item">
                <Link href={file.href} className="details-file-link" target="_blank">
                  <span className="details-file-icon">
                    <Icon name={ICON_NAMES.FILE} />
                  </span>
                  <div className="details-file-meta">
                    <span className="details-file-name">{file.name}</span>
                    {file.sizeLabel && <span className="details-file-size">{file.sizeLabel}</span>}
                  </div>
                  <Icon name={ICON_NAMES.DOWNLOAD} className="details-file-action" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

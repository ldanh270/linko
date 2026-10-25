"use client"

import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import type { ComposerFilePreview } from "../chat.types"

export interface ComposerFilePreviewsProps {
  readonly previews: readonly ComposerFilePreview[]
  readonly onRemove: (index: number) => void
}

/** Render Messenger-style thumbnails and file cards for composer drafts. UI only. */
export function ComposerFilePreviews({ previews, onRemove }: ComposerFilePreviewsProps) {
  if (previews.length === 0) return null

  return (
    <div className="composer-previews" role="region" aria-label="Tệp đính kèm đã chọn">
      {previews.map((item, index) => (
        <div
          key={item.id}
          className={`composer-preview-item ${item.isImage ? "composer-preview-item--image" : "composer-preview-item--file"}`}
        >
          {item.isImage && item.previewUrl ? (
            <img src={item.previewUrl} alt={item.name} className="composer-preview-thumb" />
          ) : (
            <div className="composer-preview-file-body">
              <span className="composer-preview-file-icon" aria-hidden="true">
                <Icon name={ICON_NAMES.FILE} />
              </span>
              <div className="composer-preview-file-meta">
                <span className="composer-preview-file-name" title={item.name}>
                  {item.name}
                </span>
                <span className="composer-preview-file-size">{item.sizeLabel}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="composer-preview-remove"
            aria-label={`Xóa tệp ${item.name}`}
            title="Xóa tệp"
            onClick={() => onRemove(index)}
          >
            <Icon name={ICON_NAMES.CLOSE} />
          </button>
        </div>
      ))}
    </div>
  )
}

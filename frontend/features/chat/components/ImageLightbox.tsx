"use client"

import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useImageLightbox } from "../hooks/useImageLightbox"

export interface ImageLightboxProps {
  readonly src: string
  readonly alt: string
  readonly name: string
  readonly onClose: () => void
}

/** Render a full-screen Facebook/Messenger-style image lightbox. UI only. */
export function ImageLightbox({ src, alt, name, onClose }: ImageLightboxProps) {
  const { ref, handleBackdropClick } = useImageLightbox({ onClose })

  return (
    <div
      className="image-lightbox-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="image-lightbox-dialog"
      >
        <header className="image-lightbox-header">
          <div className="image-lightbox-meta">
            <span className="image-lightbox-title" title={name}>
              {name}
            </span>
          </div>
          <div className="image-lightbox-actions">
            <a
              href={src}
              download={name}
              className="image-lightbox-action-btn"
              title="Tải xuống"
              aria-label="Tải xuống"
            >
              <Icon name={ICON_NAMES.DOWNLOAD} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="image-lightbox-action-btn"
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <Icon name={ICON_NAMES.CLOSE} />
            </button>
          </div>
        </header>

        <div
          className="image-lightbox-stage"
          onClick={handleBackdropClick}
          role="presentation"
        >
          <img
            src={src}
            alt={alt}
            className="image-lightbox-img"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </div>
    </div>
  )
}

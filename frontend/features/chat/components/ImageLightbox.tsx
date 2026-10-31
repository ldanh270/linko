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
      className="fixed inset-0 z-9999 flex flex-col bg-black/90 backdrop-blur-md animate-[lightboxFadeIn_0.2s_ease-out]"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className="flex flex-col w-full h-full outline-none"
      >
        <header className="relative z-10 flex items-center justify-between px-6 py-3.5 bg-black/45 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center min-w-0 max-w-[70%]">
            <span className="text-zinc-100 text-sm font-medium truncate" title={name}>
              {name}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <a
              href={src}
              download={name}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 text-white border-0 cursor-pointer text-xl no-underline transition-all hover:bg-white/25 hover:scale-105 active:scale-95"
              title="Tải xuống"
              aria-label="Tải xuống"
            >
              <Icon name={ICON_NAMES.DOWNLOAD} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/15 text-white border-0 cursor-pointer text-xl no-underline transition-all hover:bg-white/25 hover:scale-105 active:scale-95"
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <Icon name={ICON_NAMES.CLOSE} />
            </button>
          </div>
        </header>

        <div
          className="flex-1 flex items-center justify-center p-6 min-h-0 cursor-zoom-out select-none"
          onClick={handleBackdropClick}
          role="presentation"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-[92vw] max-h-[calc(100vh-110px)] object-contain cursor-default rounded-md shadow-2xl animate-[lightboxImgScale_0.22s_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      </div>
    </div>
  )
}

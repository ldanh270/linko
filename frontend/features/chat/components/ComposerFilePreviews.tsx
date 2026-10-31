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
    <div
      className="flex items-center gap-2.5 overflow-x-auto py-1 px-1 mb-2.5 [scrollbar-width:thin]"
      role="region"
      aria-label="Tệp đính kèm đã chọn"
    >
      {previews.map((item, index) => {
        const isImage = item.isImage && item.previewUrl
        return (
          <div
            key={item.id}
            className={`relative shrink-0 rounded-md border border-border bg-surface transition-all ${
              isImage
                ? "w-[68px] h-[68px] overflow-hidden"
                : "flex items-center py-2 px-3 pr-[34px] max-w-[220px] min-h-[52px]"
            }`}
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover block" />
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[20px] text-brand shrink-0" aria-hidden="true">
                  <Icon name={ICON_NAMES.FILE} />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-text-primary truncate max-w-[140px]" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-[11px] text-text-secondary">{item.sizeLabel}</span>
                </div>
              </div>
            )}
            <button
              type="button"
              className={
                isImage
                  ? "absolute top-1 right-1 w-[22px] h-[22px] rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer border-none text-[13px] p-0 transition-all hover:bg-black/85 hover:scale-105 z-10"
                  : "absolute top-1/2 -translate-y-1/2 right-2 w-[22px] h-[22px] rounded-full bg-surface-hover text-text-secondary border border-border flex items-center justify-center cursor-pointer text-[13px] p-0 transition-all hover:bg-border hover:text-text-primary hover:scale-105 z-10"
              }
              aria-label={`Xóa tệp ${item.name}`}
              title="Xóa tệp"
              onClick={() => onRemove(index)}
            >
              <Icon name={ICON_NAMES.CLOSE} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

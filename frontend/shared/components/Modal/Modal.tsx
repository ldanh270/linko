"use client"

import { useId, type ReactNode } from "react"
import { IconButton } from "../IconButton"
import { Icon } from "../../icons/Icon"
import { ICON_NAMES } from "../../icons/icon.constants"
import { useModal } from "./useModal"

/** Modal content and dismissal contract. */
export interface ModalProps { readonly title: string; readonly children: ReactNode; readonly onClose: () => void }

/** Render a focus-managed dialog with an independently scrolling body. UI only. */
export function Modal({ title, children, onClose }: ModalProps) {
  const { ref } = useModal(onClose)
  const titleId = useId()
  return (
    <div className="fixed inset-0 z-60 grid place-items-center p-5 bg-black/45 backdrop-blur-xs">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-[min(100%,560px)] max-h-[calc(100dvh-40px)] overflow-y-auto bg-[var(--surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] border border-[var(--border-subtle)]"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 id={titleId} className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <IconButton label="Đóng" icon={<Icon name={ICON_NAMES.CLOSE} />} onClick={onClose} />
        </header>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

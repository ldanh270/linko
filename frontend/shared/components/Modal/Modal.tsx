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
  return <div className="modal-backdrop"><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="modal-panel">
    <header className="modal-header"><h2 id={titleId}>{title}</h2><IconButton label="Đóng" icon={<Icon name={ICON_NAMES.CLOSE} />} onClick={onClose} /></header>
    <div className="modal-content">{children}</div>
  </div></div>
}

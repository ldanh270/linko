"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = 'button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]'
const DIALOG_SELECTOR = "[data-modal-dialog]"
let openDialogs = 0
let originalOverflow = ""

/** Trap modal keyboard focus and return it to the invoking control on unmount. */
export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (openDialogs === 0) originalOverflow = document.body.style.overflow
    openDialogs += 1
    document.body.style.overflow = "hidden"
    const isTopmost = () => Array.from(document.querySelectorAll(DIALOG_SELECTOR)).at(-1) === ref.current
    if (isTopmost()) ref.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost()) return
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return }
      if (event.key !== "Tab") return
      const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter((element) => element.closest(DIALOG_SELECTOR) === ref.current)
      const first = elements.at(0), last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      openDialogs -= 1
      if (openDialogs === 0) document.body.style.overflow = originalOverflow
      document.removeEventListener("keydown", onKeyDown)
      const topmost = Array.from(document.querySelectorAll(DIALOG_SELECTOR)).at(-1)
      if (trigger?.isConnected && (!topmost || topmost.contains(trigger))) trigger.focus()
    }
  }, [])
  return { ref }
}

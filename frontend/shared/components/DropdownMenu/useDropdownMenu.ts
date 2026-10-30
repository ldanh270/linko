"use client"

import { useEffect, useRef, useState } from "react"
import type { DropdownAction } from "./dropdown.types"

/** Manage contextual menu focus, dismissal and keyboard movement once for all features. */
export function useDropdownMenu(items: readonly DropdownAction[]) {
  const [isOpen, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = () => { setOpen(false); triggerRef.current?.focus() }
  useEffect(() => {
    if (!isOpen) return
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !ref.current?.contains(event.target)) setOpen(false) }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus() }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
      event.preventDefault()
      const targets = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])
      const index = targets.findIndex((target) => target === document.activeElement)
      const next = event.key === "Home" ? 0 : event.key === "End" ? targets.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + targets.length) % targets.length
      targets[next]?.focus()
    }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", keydown)
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keydown) }
  }, [isOpen])
  return { ref, triggerRef, isOpen, toggle: () => setOpen(!isOpen), items: items.map((item) => ({ ...item, onSelect: () => { close(); item.onSelect() } })) }
}

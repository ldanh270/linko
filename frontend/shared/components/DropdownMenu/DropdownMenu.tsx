"use client"

import { Button } from "../Button"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import type { DropdownAction } from "./dropdown.types"
import { useDropdownMenu } from "./useDropdownMenu"

/** Named menu with actions provided by the owning feature hook. */
export interface DropdownMenuProps { readonly label: string; readonly items: readonly DropdownAction[] }

/** Render a contextual menu with shared accessible interaction states. UI only. */
export function DropdownMenu({ label, items }: DropdownMenuProps) {
  const { ref, triggerRef, isOpen, toggle, items: actions } = useDropdownMenu(items)
  return <div className="dropdown" ref={ref}>
    <button ref={triggerRef} type="button" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={isOpen} onClick={toggle} className="dropdown-trigger inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded hover:bg-[var(--brand-soft)] active:opacity-70 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"><Icon name={ICON_NAMES.MENU} /></button>
    {isOpen && <div role="menu" aria-label={label} className="dropdown-menu">{actions.map((item) => <Button key={item.label} role="menuitem" variant="ghost" disabled={item.disabled} onClick={item.onSelect}>{item.icon && <Icon name={item.icon} />}{item.label}</Button>)}</div>}
  </div>
}

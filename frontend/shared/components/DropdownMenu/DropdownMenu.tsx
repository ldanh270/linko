"use client"

import { Button } from "../Button"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import type { DropdownAction } from "./dropdown.types"
import { useDropdownMenu } from "./useDropdownMenu"

export type { DropdownAction } from "./dropdown.types"

/** Named menu with actions provided by the owning feature hook. */
export interface DropdownMenuProps { readonly label: string; readonly items: readonly DropdownAction[] }

/** Render a contextual menu with shared accessible interaction states. UI only. */
export function DropdownMenu({ label, items }: DropdownMenuProps) {
  const { ref, triggerRef, isOpen, toggle, items: actions } = useDropdownMenu(items)
  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggle}
        className="inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] active:opacity-70 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
      >
        <Icon name={ICON_NAMES.MENU} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={label}
          className="absolute right-0 top-full z-30 min-w-40 p-1.5 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface)] shadow-[var(--shadow-dropdown)]"
        >
          {actions.map((item) => (
            <Button
              key={item.label}
              role="menuitem"
              variant="ghost"
              disabled={item.disabled}
              onClick={item.onSelect}
              className="w-full justify-start gap-3 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-[var(--radius-sm)]"
            >
              {item.icon && <Icon name={item.icon} />}
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

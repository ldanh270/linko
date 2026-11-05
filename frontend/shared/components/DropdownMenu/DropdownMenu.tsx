"use client"

import { Button } from "../Button"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import type { DropdownAction } from "./dropdown.types"
import { useDropdownMenu } from "./useDropdownMenu"

export type { DropdownAction } from "./dropdown.types"

/** Named menu with actions provided by the owning feature hook. */
export interface DropdownMenuProps { readonly label: string; readonly items: readonly DropdownAction[]; readonly placement?: "top" | "bottom" }

/** Render a contextual menu with shared accessible interaction states. UI only. */
export function DropdownMenu({ label, items, placement = "bottom" }: DropdownMenuProps) {
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
        className="inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-brand-soft hover:text-brand active:opacity-70 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Icon name={ICON_NAMES.MENU} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={label}
          className={`absolute ${placement === "top" ? "left-0 bottom-full mb-2" : "right-0 top-full"} z-30 min-w-52 p-1.5 border border-border rounded-md bg-surface shadow-dropdown`}
        >
          {actions.map((item) => (
            <Button
              key={item.label}
              role="menuitem"
              variant="ghost"
              disabled={item.disabled}
              onClick={item.onSelect}
              className="w-full justify-start gap-3 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover rounded-sm"
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

import type { ReactNode } from "react"
import { Button } from "./Button"
import { Icon } from "../icons/Icon"
import { ICON_NAMES, type IconName } from "../icons/icon.constants"

/** Controlled disclosure props keep section state in the owning URL hook. */
export interface AccordionProps {
  readonly title: string; readonly id: string; readonly icon?: IconName
  readonly isOpen: boolean; readonly onToggle: () => void; readonly children: ReactNode
}

/** Render one reference-style disclosure without owning feature state. UI only. */
export function Accordion({ title, id, icon, isOpen, onToggle, children }: AccordionProps) {
  return (
    <section className="border-b border-[var(--border)]">
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between px-6 py-4 text-base font-medium text-[var(--text-primary)] rounded-none min-h-[52px]"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={onToggle}
      >
        {icon && <Icon name={icon} />}
        <span className="flex-1 text-left ml-3">{title}</span>
        <Icon name={ICON_NAMES.CHEVRON} className={`transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </Button>
      {isOpen && (
        <div id={id} className="px-6 pb-4">
          {children}
        </div>
      )}
    </section>
  )
}

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
  return <section className="reference-accordion">
    <Button variant="ghost" className="accordion-toggle" aria-expanded={isOpen} aria-controls={id} onClick={onToggle}>
      {icon && <Icon name={icon} />}<span>{title}</span><Icon name={ICON_NAMES.CHEVRON} className={isOpen ? "rotate-180" : ""} />
    </Button>
    {isOpen && <div id={id} className="accordion-content">{children}</div>}
  </section>
}

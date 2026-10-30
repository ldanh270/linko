import { Button } from "@/shared/components/Button"
import { DropdownMenu } from "@/shared/components/DropdownMenu/DropdownMenu"
import type { usePeoplePage } from "../hooks/usePeoplePage"

/** Prepared contact label and supported actions. */
export interface ContactRowProps { readonly contact: ReturnType<typeof usePeoplePage>["groups"][number]["contacts"][number] }

/** Render the reference's compact name/action row. UI only. */
export function ContactRow({ contact }: ContactRowProps) {
  return <li className="contact-row"><Button variant="ghost" className="contact-name" disabled={contact.isOpening} onClick={contact.onOpen}>{contact.name}</Button><DropdownMenu label={`Tùy chọn ${contact.name}`} items={contact.menu} /></li>
}

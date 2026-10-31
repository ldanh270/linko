import type { usePeoplePage } from "../hooks/usePeoplePage"
import { ContactRow } from "./ContactRow"

/** Alphabetical contact group from the feature hook. */
export interface ContactGroupProps { readonly group: ReturnType<typeof usePeoplePage>["groups"][number] }

/** Render a letter heading followed by its compact contact list. UI only. */
export function ContactGroup({ group }: ContactGroupProps) {
  return (
    <section className="px-6 pb-3.5">
      <h2 className="px-3 pb-3 text-[var(--brand)] text-base font-semibold">{group.letter}</h2>
      <ul>{group.contacts.map((contact) => <ContactRow key={contact.id} contact={contact} />)}</ul>
    </section>
  )
}

import { USER_PROFILE_FIELDS, type FriendDto } from "@linko/contracts"
import { normalizeSearch } from "@/shared/text/search"

/** Alphabetical contact group retains safe public profiles. */
export interface ContactGroupView { readonly letter: string; readonly contacts: readonly FriendDto[] }

/** Sort and group real contacts with Vietnamese-aware labels and accent-insensitive search. */
export function groupContacts(contacts: readonly FriendDto[], search: string): ContactGroupView[] {
  const groups = new Map<string, FriendDto[]>()
  const matching = contacts.filter((person) => normalizeSearch(`${person[USER_PROFILE_FIELDS.DISPLAY_NAME]} ${person[USER_PROFILE_FIELDS.USERNAME]}`).includes(normalizeSearch(search)))
  const sorted = [...matching].sort((left, right) => left.displayName.localeCompare(right.displayName, "vi"))
  for (const person of sorted) {
    const name = person.displayName || person.username
    const letter = normalizeSearch(name).charAt(0).toUpperCase() || "#"
    groups.set(letter, [...(groups.get(letter) ?? []), person])
  }
  return [...groups].sort(([left], [right]) => left.localeCompare(right, "vi")).map(([letter, members]) => ({ letter, contacts: members }))
}

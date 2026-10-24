import type { ConversationRowViewModel } from "../inbox.types"
import { RecentPerson } from "./RecentPerson"

/** Recently available conversation shortcuts. */
export interface RecentPeopleStripProps { readonly people: readonly ConversationRowViewModel[] }

/** Render the horizontally scrolling reference people strip. UI only. */
export function RecentPeopleStrip({ people }: RecentPeopleStripProps) {
  return <div className="people-strip" aria-label="Trò chuyện gần đây">{people.map((person) => <RecentPerson key={person.id} person={person} />)}</div>
}

import { Avatar } from "@/shared/components/Avatar"
import { Button } from "@/shared/components/Button"
import type { usePeoplePage } from "../hooks/usePeoplePage"

/** Search result and pending mutation state. */
export interface SearchPersonRowProps { readonly person: ReturnType<typeof usePeoplePage>["searchRows"][number]; readonly isPending: boolean }

/** Render a safe public search result with an honest request state. UI only. */
export function SearchPersonRow({ person, isPending }: SearchPersonRowProps) {
  return <li className="flex items-center gap-3 border-b border-[var(--border)] py-3"><Avatar label={person.displayName} src={person.avatarUrl} /><div className="min-w-0 flex-1"><p className="truncate text-sm">{person.displayName}</p><p className="quiet-copy">@{person.username}</p></div><Button size="small" disabled={person.isFriend || person.isRequested} isLoading={isPending} onClick={person.onRequest}>{person.isFriend ? "Đã là bạn" : person.isRequested ? "Đã gửi" : "Kết bạn"}</Button></li>
}

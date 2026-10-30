import { Avatar } from "@/shared/components/Avatar"
import { Button } from "@/shared/components/Button"
import type { usePeoplePage } from "../hooks/usePeoplePage"

/** One incoming request and mutation pending state. */
export interface FriendRequestRowProps { readonly request: ReturnType<typeof usePeoplePage>["requestRows"][number]; readonly isPending: boolean }

/** Render actionable incoming friendship requests. UI only. */
export function FriendRequestRow({ request, isPending }: FriendRequestRowProps) {
  return <li className="flex items-center gap-3 border-b border-[var(--border)] py-3"><Avatar label={request.from.displayName} src={request.from.avatarUrl} /><span className="min-w-0 flex-1 truncate text-sm">{request.from.displayName}</span><Button size="small" disabled={isPending} onClick={request.onAccept}>Chấp nhận</Button><Button variant="ghost" size="small" disabled={isPending} onClick={request.onDecline}>Từ chối</Button></li>
}

"use client"

import { useEffect, useSyncExternalStore } from "react"
import { getSharedChatSocket } from "@/features/chat/api/chatSocket"
import { subscribeSocketReset } from "@/shared/realtime/socketSession"
import { PresenceClientStore } from "./PresenceClientStore"

const store = new PresenceClientStore(getSharedChatSocket)
const emptySnapshot: Readonly<Record<string, boolean>> = {}
const getServerSnapshot = () => emptySnapshot
subscribeSocketReset(store.reset)

/**
 * Subscribe to stable, account-scoped presence without re-querying on array identity changes.
 * @returns Online lookup and snapshot for the currently tracked identifiers.
 */
export function usePresence(userIds: readonly string[] = []) {
  const presence = useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot)
  const idsKey = [...new Set(userIds)].sort().join(",")
  useEffect(() => store.track(idsKey ? idsKey.split(",") : []), [idsKey])
  return { isOnline: (userId?: string | null) => Boolean(userId && presence[userId]), presence }
}

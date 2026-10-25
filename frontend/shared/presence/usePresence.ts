"use client"

import { useEffect, useState } from "react"
import { SOCKET_EVENTS, type PresenceEventDto } from "@linko/contracts"
import { createChatSocket } from "@/features/chat/api/chatSocket"

let sharedSocket: ReturnType<typeof createChatSocket> | null = null
const listeners = new Set<(state: Record<string, boolean>) => void>()
let currentPresence: Record<string, boolean> = {}

function getPresenceSocket() {
  if (!sharedSocket) {
    sharedSocket = createChatSocket()
    sharedSocket.on(SOCKET_EVENTS.PRESENCE_ONLINE, (data: PresenceEventDto) => {
      if (data?.userId) {
        currentPresence = { ...currentPresence, [data.userId]: true }
        listeners.forEach((notify) => notify(currentPresence))
      }
    })
    sharedSocket.on(SOCKET_EVENTS.PRESENCE_OFFLINE, (data: PresenceEventDto) => {
      if (data?.userId) {
        currentPresence = { ...currentPresence, [data.userId]: false }
        listeners.forEach((notify) => notify(currentPresence))
      }
    })
  }
  return sharedSocket
}

/** Subscribe to realtime presence updates and query user statuses. */
export function usePresence(userIds: readonly string[] = []) {
  const [presence, setPresence] = useState<Record<string, boolean>>(() => currentPresence)

  useEffect(() => {
    const notify = (updated: Record<string, boolean>) => setPresence(updated)
    listeners.add(notify)

    const socket = getPresenceSocket()
    if (userIds.length > 0) {
      socket.emit(SOCKET_EVENTS.PRESENCE_QUERY, userIds, (batch: Record<string, boolean>) => {
        if (batch && typeof batch === "object") {
          currentPresence = { ...currentPresence, ...batch }
          setPresence({ ...currentPresence })
        }
      })
    }

    return () => {
      listeners.delete(notify)
    }
  }, [userIds.join(",")])

  return {
    isOnline: (userId: string) => Boolean(presence[userId]),
    presence,
  }
}

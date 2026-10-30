"use client"

import { useEffect, useState } from "react"
import { SOCKET_EVENTS, type PresenceEventDto } from "@linko/contracts"
import { getSharedChatSocket, type ChatSocket } from "@/features/chat/api/chatSocket"

let sharedSocket: ChatSocket | null = null
const listeners = new Set<(state: Record<string, boolean>) => void>()
let currentPresence: Record<string, boolean> = {}
const trackedIds = new Set<string>()

function queryBatch(ids: readonly string[]) {
  if (ids.length === 0 || !sharedSocket) return
  sharedSocket.emit(SOCKET_EVENTS.PRESENCE_QUERY, ids, (batch: Record<string, boolean>) => {
    if (batch && typeof batch === "object") {
      currentPresence = { ...currentPresence, ...batch }
      listeners.forEach((notify) => notify(currentPresence))
    }
  })
}

function getPresenceSocket(): ChatSocket {
  if (!sharedSocket) {
    sharedSocket = getSharedChatSocket()

    sharedSocket.on(SOCKET_EVENTS.CONNECT, () => {
      if (trackedIds.size > 0) {
        queryBatch(Array.from(trackedIds))
      }
    })

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

    userIds.forEach((id) => trackedIds.add(id))
    const socket = getPresenceSocket()

    if (userIds.length > 0) {
      queryBatch(userIds)
    }

    return () => {
      listeners.delete(notify)
    }
  }, [userIds.join(",")])

  return {
    isOnline: (userId?: string | null) => Boolean(userId && presence[userId]),
    presence,
  }
}

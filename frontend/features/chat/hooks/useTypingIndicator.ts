"use client"

import { useEffect, useRef, useState } from "react"
import { SOCKET_EVENTS, SOCKET_LIFECYCLE, TYPING_TIMING, type TypingEventDto } from "@linko/contracts"
import { getSharedChatSocket } from "../api/chatSocket"

/** Realtime typing hook tracks users typing in the active conversation. */
export function useTypingIndicator(conversationId: string, currentUserId?: string) {
  const scope = `${conversationId}:${currentUserId ?? ""}`
  const [typingState, setTypingState] = useState<{ scope: string; ids: readonly string[] }>({ scope, ids: [] })
  /** Reset during a scope change so returning to a previously visited chat cannot revive expired state. */
  if (typingState.scope !== scope) setTypingState({ scope, ids: [] })
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const setTypingUserIds = (update: (current: readonly string[]) => readonly string[]) => {
      setTypingState((current) => ({ scope, ids: update(current.scope === scope ? current.ids : []) }))
    }
    const socket = getSharedChatSocket()
    const timeouts = timeoutsRef.current

    const clearUserTimeout = (id: string) => {
      const existing = timeouts.get(id)
      if (existing) {
        clearTimeout(existing)
        timeouts.delete(id)
      }
    }

    const onTypingUpdate = (data: TypingEventDto) => {
      if (!data || data.conversationId !== conversationId || data.userId === currentUserId) return

      const userId = data.userId
      clearUserTimeout(userId)

      if (data.isTyping) {
        setTypingUserIds((current) => (current.includes(userId) ? current : [...current, userId]))
        const timer = setTimeout(() => {
          setTypingUserIds((current) => current.filter((id) => id !== userId))
          timeouts.delete(userId)
        }, TYPING_TIMING.EXPIRY_MS)
        timeouts.set(userId, timer)
      } else {
        setTypingUserIds((current) => current.filter((id) => id !== userId))
      }
    }

    socket.on(SOCKET_EVENTS.TYPING_UPDATE, onTypingUpdate)
    const clearTyping = () => {
      timeouts.forEach((timer) => clearTimeout(timer))
      timeouts.clear()
      setTypingUserIds(() => [])
    }
    socket.on(SOCKET_LIFECYCLE.DISCONNECT, clearTyping)

    return () => {
      socket.off(SOCKET_EVENTS.TYPING_UPDATE, onTypingUpdate)
      socket.off(SOCKET_LIFECYCLE.DISCONNECT, clearTyping)
      timeouts.forEach((timer) => clearTimeout(timer))
      timeouts.clear()
    }
  }, [conversationId, currentUserId, scope])

  return { typingUserIds: typingState.scope === scope ? typingState.ids : [] }
}

"use client"

import { useEffect, useRef, useState } from "react"
import { SOCKET_EVENTS, type TypingEventDto } from "@linko/contracts"
import { createChatSocket } from "../api/chatSocket"

/** Realtime typing hook tracks users typing in the active conversation. */
export function useTypingIndicator(conversationId: string, currentUserId?: string) {
  const [typingUserIds, setTypingUserIds] = useState<readonly string[]>([])
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const socket = createChatSocket()
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
        }, 3500)
        timeouts.set(userId, timer)
      } else {
        setTypingUserIds((current) => current.filter((id) => id !== userId))
      }
    }

    socket.on(SOCKET_EVENTS.TYPING_UPDATE, onTypingUpdate)

    return () => {
      socket.off(SOCKET_EVENTS.TYPING_UPDATE, onTypingUpdate)
      timeouts.forEach((timer) => clearTimeout(timer))
      timeouts.clear()
    }
  }, [conversationId, currentUserId])

  return { typingUserIds }
}

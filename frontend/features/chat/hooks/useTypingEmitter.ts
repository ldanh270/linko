"use client"

import { useCallback, useEffect, useRef } from "react"
import { SOCKET_EVENTS, TYPING_TIMING } from "@linko/contracts"
import { getSharedChatSocket } from "../api/chatSocket"

/** Recipient and sender privacy preference for ephemeral typing updates. */
export interface TypingEmitterOptions {
  readonly conversationId: string
  readonly isEnabled: boolean
}

/**
 * Own throttled typing refreshes and stop on idle, preference changes or unmount.
 * @returns Stable typing and stop callbacks; disconnected updates are never buffered.
 */
export function useTypingEmitter({ conversationId, isEnabled }: TypingEmitterOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRefresh = useRef<number | null>(null)

  const onStopTyping = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const wasTyping = lastRefresh.current !== null
    lastRefresh.current = null
    const socket = getSharedChatSocket()
    if (wasTyping && socket.connected) socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId })
  }, [conversationId])

  useEffect(() => onStopTyping, [onStopTyping, isEnabled])

  const onTyping = useCallback(() => {
    const socket = getSharedChatSocket()
    if (!isEnabled || !socket.connected) return
    const now = Date.now()
    if (lastRefresh.current === null || now - lastRefresh.current >= TYPING_TIMING.REFRESH_MS) {
      socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId })
      lastRefresh.current = now
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(onStopTyping, TYPING_TIMING.IDLE_MS)
  }, [conversationId, isEnabled, onStopTyping])

  return { onTyping, onStopTyping }
}

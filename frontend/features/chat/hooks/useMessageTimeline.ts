"use client"

import { useLayoutEffect, useRef } from "react"
import type { MessageViewModel } from "../chat.types"
import { useVisibleMessageRead } from "./useVisibleMessageRead"

/** Preserve the scroll anchor for older pages and follow new messages near the bottom. */
export function useMessageTimeline(messages: readonly MessageViewModel[], loadOlder: () => Promise<unknown>, conversationId: string) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const olderSnapshot = useRef<{ height: number; top: number } | null>(null)
  const previousCount = useRef(0)
  const newestMessageId = messages.at(-1)?.id
  const isOwn = messages.at(-1)?.isOwn
  const messageCount = messages.length
  useLayoutEffect(() => {
    const node = timelineRef.current
    if (!node) return
    if (olderSnapshot.current) {
      node.scrollTop = olderSnapshot.current.top + node.scrollHeight - olderSnapshot.current.height
      olderSnapshot.current = null
    } else if (!previousCount.current || node.scrollHeight - node.clientHeight - node.scrollTop < 240 || isOwn) node.scrollTop = node.scrollHeight
    previousCount.current = messageCount
  }, [messageCount, newestMessageId, isOwn])
  useVisibleMessageRead({ timelineRef, conversationId, newestMessageId })
  const onLoadOlder = async () => {
    const node = timelineRef.current
    if (node) olderSnapshot.current = { height: node.scrollHeight, top: node.scrollTop }
    await loadOlder()
  }
  return { timelineRef, onLoadOlder }
}

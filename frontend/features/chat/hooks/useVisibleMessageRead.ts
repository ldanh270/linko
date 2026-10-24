"use client"

import { useEffect, type RefObject } from "react"
import { markConversationRead } from "@/features/inbox/api/read.api"

/** Read-observer inputs keep transport separate from message markup. */
export interface VisibleMessageReadOptions { readonly timelineRef: RefObject<HTMLDivElement | null>; readonly conversationId: string; readonly newestMessageId?: string }

/** Advance read state only when the newest message is visible in a foreground conversation. */
export function useVisibleMessageRead({ timelineRef, conversationId, newestMessageId }: VisibleMessageReadOptions) {
  useEffect(() => {
    const root = timelineRef.current
    const target = Array.from(root?.querySelectorAll<HTMLElement>("[data-message-id]") ?? []).find((node) => node.dataset.messageId === newestMessageId)
    if (!root || !target || !newestMessageId) return
    const controller = new AbortController()
    let isIntersecting = false, hasMarked = false
    const mark = () => {
      if (!isIntersecting || hasMarked || document.visibilityState !== "visible") return
      hasMarked = true
      void markConversationRead({ conversationId, lastVisibleMessageId: newestMessageId, signal: controller.signal }).catch(() => { hasMarked = false })
    }
    const observer = new IntersectionObserver((entries) => { isIntersecting = entries.some((entry) => entry.isIntersecting); mark() }, { root, threshold: 0.5 })
    observer.observe(target); document.addEventListener("visibilitychange", mark)
    return () => { controller.abort(); observer.disconnect(); document.removeEventListener("visibilitychange", mark) }
  }, [conversationId, newestMessageId, timelineRef])
}

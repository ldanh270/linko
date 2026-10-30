"use client"

import { useSyncExternalStore } from "react"
import { useWorkspaceNavigation } from "./useWorkspaceNavigation"

const DESKTOP_QUERY = "(min-width: 1024px)"
const getDesktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches
const getServerSnapshot = () => false
const subscribeDesktop = (notify: () => void) => {
  const media = window.matchMedia(DESKTOP_QUERY)
  media.addEventListener("change", notify)
  return () => media.removeEventListener("change", notify)
}

/** Resolve actual responsive chat visibility for notification suppression. */
export function useVisibleConversationId(): string | null {
  const { conversationId, isConversationView, isDetail } = useWorkspaceNavigation()
  const isDesktop = useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, getServerSnapshot)
  return conversationId && !isDetail && (isConversationView || isDesktop) ? conversationId : null
}

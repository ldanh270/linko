"use client"
import { useEffect, useRef, useSyncExternalStore } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { SOCKET_EVENTS, UTILITY_EVENTS, UTILITY_KIND, type UtilityChangedEvent } from "@linko/contracts"
import { getSharedChatSocket } from "@/features/chat/api/chatSocket"
import { CHAT_QUERY_KEYS } from "@/features/chat/chat.constants"
import { subscribeSocketReset } from "@/shared/realtime/socketSession"
import { useToast } from "@/shared/components/useToast"
import { utilityApi } from "../api/utility.api"
import { getLocationPublisher, type PublishingShare } from "../location-publisher"
import { UTILITY_UI } from "../utility.constants"
import { UTILITY_QUERY_PARTS } from "../utility-query.constants"
import { useUtilityPanel } from "./useUtilityPanel"
import { readStoredChatPreferences } from "@/features/chat/preferences/chat-preferences"
import { notificationSound } from "@/shared/sound/notificationSound"
import { showBrowserNotification } from "@/features/notifications/api/browserNotification"

const emptyShares: readonly PublishingShare[] = []
const SESSION_LIMITS = { MAX_SEEN: 500, MAX_ALERT_AGE_MS: 86400000, SUMMARY_REFRESH_MS: 60000, PUBLISHER_REFRESH_MS: 5000 } as const
/** Own one authenticated utility event subscription and route-independent foreground publisher lifecycle. */
export function useUtilitiesSession() {
  const client = useQueryClient()
  const toast = useToast()
  const toastRef = useRef(toast.show)
  useEffect(() => { toastRef.current = toast.show }, [toast.show])
  const publisher = getLocationPublisher()
  const shares = useSyncExternalStore(publisher.subscribe, publisher.snapshot, () => emptyShares)
  const panel = useUtilityPanel()
  const reminders = useQuery({ queryKey: [UTILITY_UI.REMINDERS, UTILITY_QUERY_PARTS.SUMMARY], queryFn: () => utilityApi.reminderInbox(), refetchInterval: SESSION_LIMITS.SUMMARY_REFRESH_MS })
  useEffect(() => {
    const socket = getSharedChatSocket()
    let disposed = false
    let authorizationGeneration = 0
    const seen = new Set<string>()
    const refresh = () => { if (!disposed) { void client.invalidateQueries({ queryKey: [UTILITY_UI.QUERY] }); void client.invalidateQueries({ queryKey: [UTILITY_UI.REMINDERS] }) } }
    const changed = (event: UtilityChangedEvent) => {
      if (disposed || !event?.conversationId) return
      void client.invalidateQueries({ queryKey: [UTILITY_UI.QUERY, event.conversationId] })
      if (event.kind === UTILITY_KIND.PIN) void client.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.PINS, event.conversationId] })
    }
    const accessChanged = (event: { conversationId?: string }) => {
      if (disposed || !event?.conversationId) return
      authorizationGeneration += 1
      void client.resetQueries({ queryKey: [UTILITY_UI.QUERY, event.conversationId] })
      void client.resetQueries({ queryKey: [UTILITY_QUERY_PARTS.CONTEXT, event.conversationId] })
      void client.resetQueries({ queryKey: [UTILITY_UI.REMINDERS] })
    }
    const deliverReminder = async (reminderId: string) => {
      const generation = authorizationGeneration
      try {
        const item = await client.fetchQuery({ queryKey: [UTILITY_UI.REMINDERS, UTILITY_QUERY_PARTS.DELIVERY, reminderId], queryFn: () => utilityApi.reminder(reminderId), staleTime: 0 })
        if (disposed || generation !== authorizationGeneration || !item.deliveredAt || Date.now() - Date.parse(item.dueAt) > SESSION_LIMITS.MAX_ALERT_AGE_MS) return
        const preview = readStoredChatPreferences().previewToast ? item.title : "Bạn có lời nhắc mới."
        if (!document.hidden) toastRef.current(preview, "info")
        else showBrowserNotification({ title: "Nhắc lịch Linko", body: preview, tag: reminderId, onClick: () => {
          if (disposed) return
          const url = new URL(window.location.href)
          url.searchParams.set(UTILITY_UI.PANEL, UTILITY_UI.INBOX)
          window.location.assign(url.pathname + url.search + url.hash)
        } })
        notificationSound.play()
      } catch { /** An inaccessible source must never produce a reminder preview. */ }
    }
    const delivered = (event: { reminderId: string }) => {
      if (disposed || !event?.reminderId || seen.has(event.reminderId)) return
      seen.add(event.reminderId); refresh()
      if (seen.size > SESSION_LIMITS.MAX_SEEN) { const oldest = seen.values().next().value; if (oldest) seen.delete(oldest) }
      void deliverReminder(event.reminderId)
    }
    const reset = subscribeSocketReset(() => { disposed = true; authorizationGeneration += 1; seen.clear(); client.removeQueries({ queryKey: [UTILITY_UI.QUERY] }); client.removeQueries({ queryKey: [UTILITY_UI.REMINDERS] }); client.removeQueries({ queryKey: [UTILITY_QUERY_PARTS.CONTEXT] }) })
    socket.on(UTILITY_EVENTS.CHANGED, changed); socket.on(UTILITY_EVENTS.REMINDER, delivered); socket.on(SOCKET_EVENTS.CONNECT, refresh)
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, accessChanged); socket.on(SOCKET_EVENTS.MEMBERSHIP_CHANGED, accessChanged)
    const resume = () => publisher.refresh()
    document.addEventListener("visibilitychange", resume)
    window.addEventListener("online", resume); window.addEventListener("offline", resume)
    const timer = setInterval(resume, SESSION_LIMITS.PUBLISHER_REFRESH_MS)
    return () => { disposed = true; reset(); clearInterval(timer); socket.off(UTILITY_EVENTS.CHANGED, changed); socket.off(UTILITY_EVENTS.REMINDER, delivered); socket.off(SOCKET_EVENTS.CONNECT, refresh); socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, accessChanged); socket.off(SOCKET_EVENTS.MEMBERSHIP_CHANGED, accessChanged); document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); window.removeEventListener("offline", resume) }
  }, [client, publisher])
  return { shares, stop: (id: string) => { void publisher.stop(id) }, resume: () => publisher.resume(), reminders, unread: reminders.data?.unreadCount ?? 0, panel }
}

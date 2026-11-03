"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { MESSAGE_FIELDS, NOTIFICATION_PREFERENCE_FIELDS, SOCKET_EVENTS, type MessageDto } from "@linko/contracts"
import { getSharedChatSocket } from "@/features/chat/api/chatSocket"
import { CHAT_QUERY_KEYS } from "@/features/chat/chat.constants"
import { readStoredChatPreferences } from "@/features/chat/preferences/chat-preferences"
import { updateInboxItemWithNewMessage } from "@/features/inbox/inbox.cache"
import { INBOX_QUERY_KEY } from "@/features/inbox/inbox.constants"
import { useCurrentProfile } from "@/features/profile/hooks/useCurrentProfile"
import { getGroupNotificationPreference } from "@/features/settings/api/notification.api"
import { useToast } from "@/shared/components/useToast"
import { useI18n } from "@/shared/i18n/useI18n"
import { subscribeSocketReset } from "@/shared/realtime/socketSession"
import { notificationSound } from "@/shared/sound/notificationSound"
import { getBrowserNotificationPermission, showBrowserNotification } from "../api/browserNotification"
import { resolveNotificationRoute } from "../api/notificationRoute"
import { NOTIFICATION_DELIVERY } from "../notification.constants"
import { evaluateMessageNotification, MessageNotificationDeduplicator } from "../notification.policy"

/**
 * Own one authenticated, route-independent message delivery subscription.
 * @returns Nothing; updates unread cache, then applies mute/visibility/privacy policy once per message.
 */
export function useRealtimeNotifications(visibleConversationId: string | null): void {
  const client = useQueryClient()
  const currentUserId = useCurrentProfile().data?.id
  const toast = useToast()
  const { copy } = useI18n()
  const router = useRouter()
  const context = useRef({ visibleConversationId, show: toast.show, copy, router })
  useEffect(() => { context.current = { visibleConversationId, show: toast.show, copy, router } }, [visibleConversationId, toast.show, copy, router])

  useEffect(() => {
    if (!currentUserId) return
    const socket = getSharedChatSocket()
    const dedup = new MessageNotificationDeduplicator()
    let disposed = false
    const reset = subscribeSocketReset(() => { disposed = true; dedup.clear() })
    const onConnect = () => { if (!disposed) void client.invalidateQueries({ queryKey: INBOX_QUERY_KEY }) }
    const onConversationUpdated = () => {
      onConnect()
      void client.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.PINS] })
      void client.invalidateQueries({ queryKey: [CHAT_QUERY_KEYS.MEMBERS] })
    }

    const deliver = async (message: MessageDto): Promise<void> => {
      try {
        const preference = await getGroupNotificationPreference(message[MESSAGE_FIELDS.CONVERSATION_ID])
        if (disposed) return
        const active = context.current
        const decision = evaluateMessageNotification({ message, currentUserId, visibleConversationId: active.visibleConversationId,
          isDocumentVisible: !document.hidden, isMuted: preference[NOTIFICATION_PREFERENCE_FIELDS.IS_MUTED], permission: getBrowserNotificationPermission() })
        const content = message[MESSAGE_FIELDS.CONTENT]
        const preview = readStoredChatPreferences().previewToast && content
          ? content.slice(0, NOTIFICATION_DELIVERY.MAX_PREVIEW_LENGTH) : active.copy.notifications.newMessage
        if (decision.showToast) active.show(preview)
        if (decision.showBrowserNotification) showBrowserNotification({
          title: active.copy.notifications.newMessage, body: preview, tag: message[MESSAGE_FIELDS.ID],
          onClick: () => {
            if (!disposed) void resolveNotificationRoute(client, message[MESSAGE_FIELDS.CONVERSATION_ID]).then((href) => { if (!disposed) context.current.router.push(href) })
          },
        })
        if (decision.playSound) notificationSound.play()
      } catch {
        /** A failed membership/preference read must not reveal content or bypass mute. */
      }
    }

    const onMessageCreated = (message: MessageDto): void => {
      if (disposed || !message?.[MESSAGE_FIELDS.ID] || !dedup.accept(message[MESSAGE_FIELDS.ID])) return
      const isOwn = message[MESSAGE_FIELDS.SENDER_ID] === currentUserId
      const isReading = !document.hidden && message[MESSAGE_FIELDS.CONVERSATION_ID] === context.current.visibleConversationId
      updateInboxItemWithNewMessage(client, message, { incrementUnread: isOwn ? undefined : !isReading })
      if (!isOwn) void deliver(message)
    }

    socket.on(SOCKET_EVENTS.MESSAGE_CREATED, onMessageCreated)
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated)
    socket.on(SOCKET_EVENTS.CONNECT, onConnect)
    if (socket.connected) onConnect()
    return () => {
      disposed = true
      reset()
      dedup.clear()
      socket.off(SOCKET_EVENTS.MESSAGE_CREATED, onMessageCreated)
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated)
      socket.off(SOCKET_EVENTS.CONNECT, onConnect)
    }
  }, [client, currentUserId])
}

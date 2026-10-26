"use client"

import { useEffect, useState } from "react"
import { SOCKET_EVENTS, type MessageDto } from "@linko/contracts"
import { getSharedChatSocket } from "@/features/chat/api/chatSocket"
import { notificationSound } from "@/shared/sound/notificationSound"

/** Realtime browser push notification integration. */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) return false
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === "granted"
    } catch {
      return false
    }
  }

  const sendPushNotification = (title: string, options?: NotificationOptions) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          icon: "/favicon.ico",
          ...options,
        })
      } catch {
        // Fallback or ignored if browser blocks
      }
    }
  }

  // Listen to background messages when document is hidden
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return
    const socket = getSharedChatSocket()

    const onMessage = (message: MessageDto) => {
      if (document.hidden) {
        if (Notification.permission === "granted") {
          sendPushNotification("Linko: Tin nhắn mới", {
            body: message.content || "Bạn vừa nhận được một tệp đính kèm mới.",
          })
        }
        notificationSound.play()
      }
    }

    socket.on(SOCKET_EVENTS.MESSAGE_CREATED, onMessage)
    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_CREATED, onMessage)
    }
  }, [])

  return {
    permission,
    isSupported: typeof window !== "undefined" && "Notification" in window,
    requestPermission,
    sendPushNotification,
  }
}

"use client"

import { useEffect, useRef, useState } from "react"
import { useI18n } from "@/shared/i18n/useI18n"
import { getBrowserNotificationPermission } from "../api/browserNotification"
import { NOTIFICATION_PERMISSION } from "../notification.constants"

/**
 * Manage permission through explicit user gestures without creating another socket subscription.
 * @returns Permission state, accessible copy and the enable action for settings UI.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState(getBrowserNotificationPermission)
  const [isRequesting, setRequesting] = useState(false)
  const inFlight = useRef(false)
  const { copy } = useI18n()
  const isSupported = typeof window !== "undefined" && "Notification" in window
  useEffect(() => {
    const refresh = () => setPermission(getBrowserNotificationPermission())
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported || inFlight.current || getBrowserNotificationPermission() === NOTIFICATION_PERMISSION.DENIED) return false
    inFlight.current = true
    setRequesting(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === NOTIFICATION_PERMISSION.GRANTED
    } catch { return false }
    finally { inFlight.current = false; setRequesting(false) }
  }
  const isEnabled = permission === NOTIFICATION_PERMISSION.GRANTED
  const isDenied = permission === NOTIFICATION_PERMISSION.DENIED
  return {
    permission, isSupported, isRequesting, requestPermission,
    onEnable: () => { void requestPermission() },
    isDisabled: !isSupported || isEnabled || isDenied,
    label: isEnabled ? copy.notifications.browserEnabled : copy.notifications.enableBrowser,
    description: !isSupported ? copy.notifications.browserUnsupported : isDenied ? copy.notifications.browserDenied : copy.notifications.browserDescription,
  }
}

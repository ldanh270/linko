import { NOTIFICATION_DELIVERY, NOTIFICATION_PERMISSION } from "../notification.constants"

/** Browser delivery receives only already-approved preview text and navigation behavior. */
export interface BrowserNotificationInput { readonly title: string; readonly body: string; readonly tag: string; readonly onClick: () => void }

/** Read live browser permission without prompting or assuming platform support. */
export function getBrowserNotificationPermission(): NotificationPermission {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : NOTIFICATION_PERMISSION.DEFAULT
}

/** Deliver a silent native alert; the shared sound player owns audio exactly once. */
export function showBrowserNotification(input: BrowserNotificationInput): boolean {
  if (getBrowserNotificationPermission() !== NOTIFICATION_PERMISSION.GRANTED) return false
  try {
    const notification = new Notification(input.title, { body: input.body, tag: input.tag, icon: NOTIFICATION_DELIVERY.ICON, silent: true })
    notification.onclick = () => { notification.close(); window.focus(); input.onClick() }
    return true
  } catch {
    /** Some mobile browsers expose the API but require a service worker for delivery. */
    return false
  }
}

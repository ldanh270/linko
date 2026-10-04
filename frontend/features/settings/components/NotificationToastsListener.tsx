"use client"

import { usePathname } from "next/navigation"

import { useNotificationToasts } from "../hooks/useNotificationToasts"
import { getActiveGroupConversationId } from "../notification.constants"

/** Mount the authenticated message toast listener and suppress the room visible in the URL. */
export function NotificationToastsListener() {
    const pathname = usePathname()
    useNotificationToasts(getActiveGroupConversationId(pathname))
    return null
}

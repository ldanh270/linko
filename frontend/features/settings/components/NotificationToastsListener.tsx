"use client"

import { useVisibleConversationId } from "@/shared/layout/useVisibleConversationId"

import { useNotificationToasts } from "../hooks/useNotificationToasts"

/** Mount the authenticated message toast listener and suppress the room visible in the URL. */
export function NotificationToastsListener() {
    const conversationId = useVisibleConversationId()
    useNotificationToasts(conversationId)
    return null
}

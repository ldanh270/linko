"use client"

import { useRealtimeNotifications } from "@/features/notifications/hooks/useRealtimeNotifications"

/** Preserve the existing shell integration while one global hook owns all delivery channels. */
export function useNotificationToasts(activeConversationId: string | null): void {
  useRealtimeNotifications(activeConversationId)
}

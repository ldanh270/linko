import { MESSAGE_FIELDS, type MessageDto } from "@linko/contracts"
import { NOTIFICATION_DELIVERY, NOTIFICATION_PERMISSION } from "./notification.constants"

/** Current recipient, visibility and mute state determine eligible delivery channels. */
export interface MessageNotificationInput {
  readonly message: MessageDto
  readonly currentUserId?: string
  readonly visibleConversationId: string | null
  readonly isDocumentVisible: boolean
  readonly isMuted: boolean
  readonly permission: NotificationPermission
}

/** Channel decisions are pure; sound playback enforces its own user preference. */
export interface MessageNotificationDecision { readonly showToast: boolean; readonly showBrowserNotification: boolean; readonly playSound: boolean }

/** Select one visible alert channel without exposing own or muted messages. */
export function evaluateMessageNotification(input: MessageNotificationInput): MessageNotificationDecision {
  const eligible = Boolean(input.currentUserId) && input.message[MESSAGE_FIELDS.SENDER_ID] !== input.currentUserId && !input.isMuted
  const isReading = input.isDocumentVisible && input.message[MESSAGE_FIELDS.CONVERSATION_ID] === input.visibleConversationId
  return {
    showToast: eligible && input.isDocumentVisible && !isReading,
    showBrowserNotification: eligible && !input.isDocumentVisible && input.permission === NOTIFICATION_PERMISSION.GRANTED,
    playSound: eligible,
  }
}

/** Bound duplicate detection to the latest message IDs in one authenticated session. */
export class MessageNotificationDeduplicator {
  private readonly seen = new Set<string>()

  /** Accept a new message before any unread increment or asynchronous preference lookup. */
  accept(messageId: string): boolean {
    if (this.seen.has(messageId)) return false
    this.seen.add(messageId)
    if (this.seen.size > NOTIFICATION_DELIVERY.MAX_SEEN_IDS) {
      const oldest = this.seen.values().next().value
      if (oldest !== undefined) this.seen.delete(oldest)
    }
    return true
  }

  /** Forget account-scoped message identities on logout or subscription teardown. */
  clear(): void { this.seen.clear() }
}

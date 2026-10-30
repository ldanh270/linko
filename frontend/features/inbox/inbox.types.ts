/** Compact conversation row prepared independently of its JSX renderer. */
export interface ConversationRowViewModel {
  readonly id: string
  readonly peerId: string | null
  readonly isGroup: boolean
  readonly title: string
  readonly avatarUrl: string | null
  readonly href: string
  readonly preview: string
  readonly unreadCount: number
  readonly timestamp: string | null
  readonly timeLabel: string
  readonly firstName: string
}

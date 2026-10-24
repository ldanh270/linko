/** Compact conversation row prepared independently of its JSX renderer. */
export interface ConversationRowViewModel { readonly id: string; readonly title: string; readonly avatarUrl: string | null; readonly href: string; readonly preview: string; readonly unreadCount: number; readonly timestamp: string | null; readonly timeLabel: string; readonly firstName: string }

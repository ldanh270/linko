"use client"

import { Avatar } from "@/shared/components/Avatar"

/** Properties for the live typing indicator bubble. */
export interface TypingBubbleProps {
  readonly names: string
  readonly avatarUrl?: string | null
}

/** Render a clean, animated typing bubble with bouncing dots. UI only. */
export function TypingBubble({ names, avatarUrl }: TypingBubbleProps) {
  return (
    <div className="typing-bubble-container" aria-live="polite">
      {avatarUrl !== undefined && <Avatar label={names} src={avatarUrl} size="small" />}
      <div className="typing-bubble-card">
        <div className="typing-dots">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
        <span className="typing-label">{names} đang soạn tin...</span>
      </div>
    </div>
  )
}

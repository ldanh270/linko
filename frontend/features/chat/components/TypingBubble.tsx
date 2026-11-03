"use client"

import { Avatar } from "@/shared/components/Avatar"
import { useI18n } from "@/shared/i18n/useI18n"

/** Properties for the live typing indicator bubble. */
export interface TypingBubbleProps {
  readonly names: string
  readonly avatarUrl?: string | null
}

/** Render a clean, animated typing bubble with bouncing dots. UI only. */
export function TypingBubble({ names, avatarUrl }: TypingBubbleProps) {
  const { copy } = useI18n()
  return (
    <div className="flex items-end gap-2 my-1.5 pl-0.5 animate-in fade-in duration-200 motion-reduce:animate-none" aria-live="polite">
      {avatarUrl !== undefined && <Avatar label={names} src={avatarUrl} size="small" />}
      <div className="inline-flex items-center gap-2 bg-surface-subtle border border-border rounded-2xl px-3 py-1.5 shadow-xs">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand motion-safe:animate-bounce [animation-delay:-0.32s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-brand motion-safe:animate-bounce [animation-delay:-0.16s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-brand motion-safe:animate-bounce" />
        </div>
        <span className="text-xs font-medium text-text-secondary">{names} {copy.chat.typingStatus}</span>
      </div>
    </div>
  )
}

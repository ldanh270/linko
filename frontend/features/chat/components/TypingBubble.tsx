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
    <div className="flex items-end gap-2 my-1.5 pl-0.5 animate-in fade-in duration-200" aria-live="polite">
      {avatarUrl !== undefined && <Avatar label={names} src={avatarUrl} size="small" />}
      <div className="inline-flex items-center gap-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-2xl px-3 py-1.5 shadow-xs">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce [animation-delay:-0.32s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce [animation-delay:-0.16s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce" />
        </div>
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">{names} đang soạn tin...</span>
      </div>
    </div>
  )
}

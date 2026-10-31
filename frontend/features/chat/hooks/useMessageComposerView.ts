"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useI18n } from "@/shared/i18n/useI18n"
import { useChatPreferences } from "../preferences/useChatPreferences"
import type { useConversationPane } from "./useConversationPane"

export interface UseMessageComposerViewOptions {
  readonly state: ReturnType<typeof useConversationPane>
}

/**
 * Coordinate DOM-related textarea auto-resizing, cursor positioning,
 * emoji insertion, and focus retention for the message composer.
 * Keeps all UI lifecycle state outside presentation JSX.
 *
 * @param options - Conversation pane state containing composer controller.
 * @returns Ref, state, and handlers for MessageComposer.
 */
export function useMessageComposerView({ state }: UseMessageComposerViewOptions) {
  const { copy } = useI18n()
  const { preferences } = useChatPreferences()
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevSendingRef = useRef(state.composer.isSending)

  // Maintain focus on the input after a message send operation completes
  useEffect(() => {
    if (prevSendingRef.current && !state.composer.isSending) {
      textareaRef.current?.focus()
    }
    prevSendingRef.current = state.composer.isSending
  }, [state.composer.isSending])

  // Auto-resize textarea to expand on multi-line text and eliminate scrollbar when not overflowing
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const nextHeight = Math.min(Math.max(el.scrollHeight, 42), 140)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = el.scrollHeight > 140 ? "auto" : "hidden"
  }, [state.composer.content])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    state.composer.onSubmit(event)
    textareaRef.current?.focus()
  }

  const placeholder = preferences.sendOnEnter
    ? copy.chat.placeholderSendOnEnter
    : copy.chat.placeholderSendOnClick

  const handleSelectEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) {
      state.composer.onContentChange(`${state.composer.content}${emoji}`)
      return
    }

    const start = el.selectionStart ?? state.composer.content.length
    const end = el.selectionEnd ?? state.composer.content.length
    const nextContent =
      state.composer.content.substring(0, start) + emoji + state.composer.content.substring(end)
    state.composer.onContentChange(nextContent)

    // Restore cursor position after the inserted emoji
    requestAnimationFrame(() => {
      el.focus()
      const newPos = start + emoji.length
      el.setSelectionRange(newPos, newPos)
    })
  }

  const toggleEmojiPicker = () => {
    setIsEmojiPickerOpen((prev) => !prev)
  }

  const closeEmojiPicker = () => {
    setIsEmojiPickerOpen(false)
  }

  return {
    textareaRef,
    placeholder,
    isEmojiPickerOpen,
    toggleEmojiPicker,
    closeEmojiPicker,
    handleSelectEmoji,
    handleSubmit,
    copy,
  }
}

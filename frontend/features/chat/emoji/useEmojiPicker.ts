import { useEffect, useRef, useState, useMemo } from "react"
import { EMOJI_CATEGORIES, type EmojiItem } from "./emoji.data"

export interface UseEmojiPickerOptions {
  readonly onSelect: (emoji: string) => void
  readonly onClose: () => void
}

/**
 * Encapsulate state, filtering, focus, outside clicks and keyboard navigation for EmojiPicker.
 * Adheres to SRP by keeping logic out of the presentation component.
 */
export function useEmojiPicker({ onSelect, onClose }: UseEmojiPickerOptions) {
  const [activeTab, setActiveTab] = useState<string>("smileys")
  const [search, setSearch] = useState("")
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Filter emojis based on search keyword
  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      const category = EMOJI_CATEGORIES.find((c) => c.id === activeTab)
      return category ? category.emojis : []
    }
    const allEmojis: EmojiItem[] = []
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.name.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        ) {
          allEmojis.push(item)
        }
      }
    }
    return allEmojis
  }, [search, activeTab])

  const selectEmoji = (emojiChar: string) => {
    onSelect(emojiChar)
    onClose()
  }

  const clearSearch = () => {
    setSearch("")
    inputRef.current?.focus()
  }

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    clearSearch,
    popoverRef,
    inputRef,
    filteredEmojis,
    selectEmoji,
    categories: EMOJI_CATEGORIES,
  }
}

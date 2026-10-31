"use client"

import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { useEmojiPicker } from "../emoji/useEmojiPicker"
import { EMOJI_CATEGORIES, type EmojiItem, type EmojiCategory } from "../emoji/emoji.data"

export { EMOJI_CATEGORIES, type EmojiItem, type EmojiCategory }

export interface EmojiPickerProps {
  readonly onSelect: (emoji: string) => void
  readonly onClose: () => void
}

/** Render accessible, interactive emoji picker popover with search and categories. UI only. */
export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    clearSearch,
    popoverRef,
    inputRef,
    filteredEmojis,
    selectEmoji,
    categories,
  } = useEmojiPicker({ onSelect, onClose })

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-[calc(100%+0.5rem)] right-16 w-80 max-w-[calc(100vw-32px)] max-h-[380px] bg-surface border border-border rounded-xl shadow-dropdown flex flex-col z-50 overflow-hidden animate-[emojiPickerFadeIn_0.15s_cubic-bezier(0.16,1,0.3,1)]"
      role="dialog"
      aria-label="Chọn biểu tượng cảm xúc"
    >
      {/* Search Header */}
      <div className="p-3 border-b border-border bg-surface-subtle/50">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm biểu tượng..."
            className="w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-xs text-text-primary placeholder-text-secondary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 text-xs text-text-secondary hover:text-text-primary p-0.5"
            >
              <Icon name={ICON_NAMES.CLOSE} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (only when not searching) */}
      {!search && (
        <div className="grid grid-cols-3 gap-1 px-3 py-2 border-b border-border bg-surface text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveTab(cat.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 font-medium transition ${
                activeTab === cat.id
                  ? "bg-brand-soft text-brand font-semibold shadow-xs"
                  : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
              }`}
            >
              <Icon name={cat.icon} className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="flex-1 overflow-y-auto p-3 max-h-64 grid grid-cols-7 gap-1">
        {filteredEmojis.length === 0 ? (
          <p className="col-span-7 text-center text-xs text-text-secondary py-6">
            Không tìm thấy biểu tượng phù hợp
          </p>
        ) : (
          filteredEmojis.map((emoji) => (
            <button
              key={`${emoji.char}-${emoji.name}`}
              type="button"
              onClick={() => selectEmoji(emoji.char)}
              title={emoji.name}
              aria-label={emoji.name}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-brand-soft/60 transition active:scale-95"
            >
              {emoji.char}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

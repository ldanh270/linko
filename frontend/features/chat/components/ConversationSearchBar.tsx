"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

export interface SearchMatch {
  readonly id: string
  readonly content: string
  readonly author: string
  readonly time: string
}

export interface ConversationSearchBarProps {
  readonly query: string
  readonly onChange: (value: string) => void
  readonly matches: readonly SearchMatch[]
  readonly activeIndex: number
  readonly onNext: () => void
  readonly onPrev: () => void
  readonly onSelectMatch: (index: number) => void
  readonly onClose: () => void
  readonly hasMoreHistory?: boolean
  readonly isLoadingMore?: boolean
  readonly onLoadMoreHistory?: () => void
}

/** Messenger-style search toolbar with match counting, keyboard stepping, and jump-to-result list. UI only. */
export function ConversationSearchBar({
  query,
  onChange,
  matches,
  activeIndex,
  onNext,
  onPrev,
  onSelectMatch,
  onClose,
  hasMoreHistory = false,
  isLoadingMore = false,
  onLoadMoreHistory,
}: ConversationSearchBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDropdownOpen) {
          setIsDropdownOpen(false)
        } else {
          onClose()
        }
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen, onClose])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (e.shiftKey) {
        onPrev()
      } else {
        onNext()
      }
    }
  }

  const matchCount = matches.length
  const currentPosition = matchCount > 0 ? activeIndex + 1 : 0

  return (
    <div className="relative border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 shadow-xs z-30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input field */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none flex items-center">
            <Icon name={ICON_NAMES.SEARCH} className="h-4 w-4" />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm tin nhắn trong cuộc trò chuyện (Enter để nhảy tiếp)..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] pl-9 pr-8 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition focus:border-[var(--brand)] focus:bg-[var(--surface)] focus:outline-hidden focus:ring-1 focus:ring-[var(--brand)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
              title="Xóa từ khóa"
            >
              <Icon name={ICON_NAMES.CLOSE} className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Match Navigation & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {query.trim() && (
            <div className="flex items-center gap-1.5 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg px-2.5 py-1">
              <span className="text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                {matchCount > 0 ? (
                  <span>
                    <strong className="text-[var(--brand)] font-semibold">{currentPosition}</strong> / {matchCount}
                  </span>
                ) : (
                  <span>0 kết quả</span>
                )}
              </span>

              {matchCount > 0 && (
                <div className="flex items-center gap-0.5 ml-1 border-l border-[var(--border)] pl-1.5">
                  <button
                    type="button"
                    onClick={onPrev}
                    title="Kết quả trước (Shift + Enter)"
                    className="flex h-6 w-6 items-center justify-center rounded text-xs text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition"
                  >
                    <Icon name={ICON_NAMES.CHEVRON_UP} className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    title="Kết quả tiếp theo (Enter)"
                    className="flex h-6 w-6 items-center justify-center rounded text-xs text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition"
                  >
                    <Icon name={ICON_NAMES.CHEVRON} className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Toggle dropdown of all matches */}
          {matchCount > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  isDropdownOpen
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]/20 text-[var(--brand)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                <span>Danh sách kết quả</span>
                <span className="rounded-full bg-[var(--brand)] text-white text-[10px] px-1.5 py-0.2 font-semibold">
                  {matchCount}
                </span>
              </button>

              {/* Match list dropdown */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-80 max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg z-50">
                  <p className="px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] border-b border-[var(--border)]">
                    Nhấn vào tin nhắn để nhảy đến vị trí
                  </p>
                  <div className="grid gap-1 mt-1">
                    {matches.map((match, idx) => {
                      const isSelected = idx === activeIndex
                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => {
                            onSelectMatch(idx)
                            setIsDropdownOpen(false)
                          }}
                          className={`w-full rounded-lg p-2 text-left transition ${
                            isSelected
                              ? "bg-[var(--brand-soft)]/30 border border-[var(--brand)]/40"
                              : "hover:bg-[var(--surface-subtle)] border border-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {match.author}
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                              {match.time}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                            {match.content}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Load older messages button if available */}
          {hasMoreHistory && (
            <button
              type="button"
              onClick={onLoadMoreHistory}
              disabled={isLoadingMore}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition disabled:opacity-50"
              title="Tải thêm lịch sử tin nhắn cũ hơn để tìm kiếm"
            >
              {isLoadingMore ? "Đang tải..." : "Tìm trong tin cũ"}
            </button>
          )}

          {/* Close search button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition"
            title="Đóng tìm kiếm"
          >
            <Icon name={ICON_NAMES.CLOSE} className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

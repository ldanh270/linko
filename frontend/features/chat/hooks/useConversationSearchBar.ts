import { useEffect, useRef, useState, type KeyboardEvent } from "react"

export interface UseConversationSearchBarOptions {
  readonly query: string
  readonly matchCount: number
  readonly activeIndex: number
  readonly onNext: () => void
  readonly onPrev: () => void
  readonly onSelectMatch: (index: number) => void
  readonly onClose: () => void
}

/**
 * Encapsulate keyboard navigation, dropdown management, and focus controls for ConversationSearchBar.
 * Adheres to SRP by keeping logic out of the presentation component.
 */
export function useConversationSearchBar({
  matchCount,
  activeIndex,
  onNext,
  onPrev,
  onSelectMatch,
  onClose,
}: UseConversationSearchBarOptions) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-focus input on mount
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

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (e.shiftKey) {
        onPrev()
      } else {
        onNext()
      }
    }
  }

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev)
  }

  const selectMatch = (index: number) => {
    onSelectMatch(index)
    setIsDropdownOpen(false)
  }

  const currentPosition = matchCount > 0 ? activeIndex + 1 : 0

  return {
    isDropdownOpen,
    toggleDropdown,
    inputRef,
    dropdownRef,
    handleInputKeyDown,
    currentPosition,
    selectMatch,
  }
}

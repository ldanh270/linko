"use client"

import { Icon } from "../icons/Icon"
import { ICON_NAMES } from "../icons/icon.constants"
import { useSearchInput } from "./useSearchInput"

/** Accessible search field props shared by compact sidebar panels. */
export interface SearchInputProps {
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly placeholder?: string
  readonly stateKey?: string
  readonly className?: string
  readonly onFocus?: () => void
  readonly onBlur?: () => void
  readonly onClear?: () => void
  readonly onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  readonly autoFocus?: boolean
}

/** Render the reference's inset icon search field with clear action and keyboard handlers. UI only. */
export function SearchInput({
  label,
  value,
  onChange,
  placeholder = label,
  stateKey,
  className,
  onFocus,
  onBlur,
  onClear,
  onKeyDown,
  autoFocus,
}: SearchInputProps) {
  const { inputRef } = useSearchInput(value, stateKey)

  const handleClear = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onChange("")
    if (inputRef.current) {
      inputRef.current.value = ""
      inputRef.current.focus()
    }
    onClear?.()
  }

  return (
    <div
      className={`group flex items-center gap-2.5 h-10 px-3 rounded-[var(--radius-md)] bg-[var(--input-surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-surface-hover)] focus-within:outline-2 focus-within:outline-[var(--border-focus)] focus-within:outline-offset-1 ${className ?? ""}`.trim()}
    >
      <Icon name={ICON_NAMES.SEARCH} className="text-[17px] flex-none text-[var(--text-secondary)]" />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:opacity-90 outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Xóa nội dung tìm kiếm"
          className="flex-none p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
        >
          <Icon name={ICON_NAMES.CLOSE} className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </div>
  )
}

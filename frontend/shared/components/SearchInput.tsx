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
}

/** Render the reference's inset icon search field. UI only. */
export function SearchInput({ label, value, onChange, placeholder = label, stateKey, className }: SearchInputProps) {
  const { inputRef } = useSearchInput(value, stateKey)
  return (
    <label
      className={`group flex items-center gap-3 h-11 px-3.5 rounded-[var(--radius-md)] bg-[var(--input-surface)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--input-surface-hover)] focus-within:outline-2 focus-within:outline-[var(--border-focus)] focus-within:outline-offset-1 ${className ?? ""}`.trim()}
    >
      <Icon name={ICON_NAMES.SEARCH} className="text-[18px] flex-none text-[var(--text-secondary)]" />
      <span className="sr-only">{label}</span>
      <input
        ref={inputRef}
        type="search"
        defaultValue={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:opacity-90 outline-none"
      />
    </label>
  )
}

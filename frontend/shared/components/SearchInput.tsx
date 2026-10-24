"use client"

import { Icon } from "../icons/Icon"
import { ICON_NAMES } from "../icons/icon.constants"
import { useSearchInput } from "./useSearchInput"

/** Accessible search field props shared by compact sidebar panels. */
export interface SearchInputProps { readonly label: string; readonly value: string; readonly onChange: (value: string) => void; readonly placeholder?: string; readonly stateKey?: string }

/** Render the reference's inset icon search field. UI only. */
export function SearchInput({ label, value, onChange, placeholder = label, stateKey }: SearchInputProps) {
  const { inputRef } = useSearchInput(value, stateKey)
  return <label className="sidebar-search"><Icon name={ICON_NAMES.SEARCH} /><span className="sr-only">{label}</span>
    <input ref={inputRef} type="search" defaultValue={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
  </label>
}

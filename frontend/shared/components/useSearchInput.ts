"use client"

import { useLayoutEffect, useRef } from "react"

/** Keep transient keystrokes in the input while URL updates are debounced; restore history changes. */
export function useSearchInput(value: string, stateKey?: string) {
  const inputRef = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => { if (inputRef.current && inputRef.current.value !== value) inputRef.current.value = value }, [value, stateKey])
  return { inputRef }
}

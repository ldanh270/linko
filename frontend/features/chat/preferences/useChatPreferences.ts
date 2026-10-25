"use client"

import { useCallback, useEffect, useState } from "react"
import {
  DEFAULT_CHAT_PREFERENCES,
  readStoredChatPreferences,
  writeStoredChatPreferences,
  type ChatPreferences,
} from "./chat-preferences"

export interface UseChatPreferencesResult {
  readonly preferences: ChatPreferences
  readonly setPreference: <K extends keyof ChatPreferences>(key: K, value: ChatPreferences[K]) => void
  readonly resetPreferences: () => void
}

export function useChatPreferences(): UseChatPreferencesResult {
  const [preferences, setPreferences] = useState<ChatPreferences>(readStoredChatPreferences)

  useEffect(() => {
    // Re-sync on window focus in case another tab updated preferences
    const handleFocus = () => {
      setPreferences(readStoredChatPreferences())
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  const setPreference = useCallback(
    <K extends keyof ChatPreferences>(key: K, value: ChatPreferences[K]) => {
      setPreferences((current) => {
        const next = { ...current, [key]: value }
        writeStoredChatPreferences(next)
        return next
      })
    },
    []
  )

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_CHAT_PREFERENCES)
    writeStoredChatPreferences(DEFAULT_CHAT_PREFERENCES)
  }, [])

  return {
    preferences,
    setPreference,
    resetPreferences,
  }
}

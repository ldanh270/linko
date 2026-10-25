import { describe, expect, it, beforeEach } from "vitest"
import {
  DEFAULT_CHAT_PREFERENCES,
  readStoredChatPreferences,
  writeStoredChatPreferences,
  CHAT_PREFERENCES_STORAGE_KEY,
} from "./chat-preferences"

describe("chat preferences", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns defaults when localStorage is empty", () => {
    const prefs = readStoredChatPreferences()
    expect(prefs).toEqual(DEFAULT_CHAT_PREFERENCES)
    expect(prefs.sendOnEnter).toBe(true)
    expect(prefs.showTypingIndicator).toBe(true)
    expect(prefs.autoScroll).toBe(true)
    expect(prefs.previewToast).toBe(true)
  })

  it("persists updated chat preferences", () => {
    writeStoredChatPreferences({
      ...DEFAULT_CHAT_PREFERENCES,
      sendOnEnter: false,
      showTypingIndicator: false,
    })

    const stored = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_STORAGE_KEY) || "{}")
    expect(stored.sendOnEnter).toBe(false)
    expect(stored.showTypingIndicator).toBe(false)

    const reloaded = readStoredChatPreferences()
    expect(reloaded.sendOnEnter).toBe(false)
    expect(reloaded.showTypingIndicator).toBe(false)
  })
})

export interface ChatPreferences {
  readonly sendOnEnter: boolean
  readonly showTypingIndicator: boolean
  readonly autoScroll: boolean
  readonly previewToast: boolean
}

export const CHAT_PREFERENCES_STORAGE_KEY = "linko_chat_preferences"

export const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  sendOnEnter: true,
  showTypingIndicator: true,
  autoScroll: true,
  previewToast: true,
}

export function readStoredChatPreferences(): ChatPreferences {
  if (typeof window === "undefined") return DEFAULT_CHAT_PREFERENCES
  try {
    const raw = localStorage.getItem(CHAT_PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_CHAT_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<ChatPreferences>
    return {
      sendOnEnter: typeof parsed.sendOnEnter === "boolean" ? parsed.sendOnEnter : DEFAULT_CHAT_PREFERENCES.sendOnEnter,
      showTypingIndicator: typeof parsed.showTypingIndicator === "boolean" ? parsed.showTypingIndicator : DEFAULT_CHAT_PREFERENCES.showTypingIndicator,
      autoScroll: typeof parsed.autoScroll === "boolean" ? parsed.autoScroll : DEFAULT_CHAT_PREFERENCES.autoScroll,
      previewToast: typeof parsed.previewToast === "boolean" ? parsed.previewToast : DEFAULT_CHAT_PREFERENCES.previewToast,
    }
  } catch {
    return DEFAULT_CHAT_PREFERENCES
  }
}

export function writeStoredChatPreferences(preferences: ChatPreferences): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CHAT_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Storage unavailable
  }
}

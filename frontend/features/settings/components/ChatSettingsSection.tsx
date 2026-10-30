"use client"

import { useChatPreferences } from "@/features/chat/preferences/useChatPreferences"
import { useI18n } from "@/shared/i18n/useI18n"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Render user preferences specifically for chat and messaging workflows. UI only. */
export function ChatSettingsSection() {
  const { preferences, setPreference } = useChatPreferences()
  const { copy } = useI18n()

  return (
    <article className="surface-panel p-6 grid gap-6">
      <div className="border-b border-[var(--border)] pb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon name={ICON_NAMES.CHAT} className="text-[var(--brand)]" />
          <span>{copy.settings.chatTitle}</span>
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{copy.settings.chatDescription}</p>
      </div>

      {/* Send on Enter toggle */}
      <div className="grid gap-3">
        <div>
          <label className="text-sm font-semibold text-[var(--text)]">{copy.settings.sendOnEnterLabel}</label>
          <p className="text-xs text-[var(--text-secondary)]">{copy.settings.sendOnEnterDescription}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPreference("sendOnEnter", true)}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
              preferences.sendOnEnter
                ? "border-[var(--brand)] bg-[var(--brand-soft)]/20 shadow-xs"
                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            <input
              type="radio"
              name="sendOnEnter"
              checked={preferences.sendOnEnter}
              onChange={() => setPreference("sendOnEnter", true)}
              className="mt-0.5 text-[var(--brand)]"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text)]">{copy.settings.sendOnEnterOptionEnter}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Tiêu chuẩn chat nhanh</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPreference("sendOnEnter", false)}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
              !preferences.sendOnEnter
                ? "border-[var(--brand)] bg-[var(--brand-soft)]/20 shadow-xs"
                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
            }`}
          >
            <input
              type="radio"
              name="sendOnEnter"
              checked={!preferences.sendOnEnter}
              onChange={() => setPreference("sendOnEnter", false)}
              className="mt-0.5 text-[var(--brand)]"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text)]">{copy.settings.sendOnEnterOptionCtrlEnter}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">Tiện cho tin nhắn nhiều dòng</p>
            </div>
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4 grid gap-4">
        {/* Typing indicator switch */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{copy.settings.typingIndicatorLabel}</p>
            <p className="text-xs text-[var(--text-secondary)]">{copy.settings.typingIndicatorDescription}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.showTypingIndicator}
            onClick={() => setPreference("showTypingIndicator", !preferences.showTypingIndicator)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              preferences.showTypingIndicator ? "bg-[var(--brand)]" : "bg-[var(--surface-subtle)] border-[var(--border)]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                preferences.showTypingIndicator ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Auto scroll switch */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{copy.settings.autoScrollLabel}</p>
            <p className="text-xs text-[var(--text-secondary)]">{copy.settings.autoScrollDescription}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.autoScroll}
            onClick={() => setPreference("autoScroll", !preferences.autoScroll)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              preferences.autoScroll ? "bg-[var(--brand)]" : "bg-[var(--surface-subtle)] border-[var(--border)]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                preferences.autoScroll ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Preview in toast switch */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{copy.settings.previewToastLabel}</p>
            <p className="text-xs text-[var(--text-secondary)]">{copy.settings.previewToastDescription}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.previewToast}
            onClick={() => setPreference("previewToast", !preferences.previewToast)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              preferences.previewToast ? "bg-[var(--brand)]" : "bg-[var(--surface-subtle)] border-[var(--border)]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                preferences.previewToast ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </article>
  )
}

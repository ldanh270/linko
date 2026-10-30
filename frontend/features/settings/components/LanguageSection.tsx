"use client"

import { useI18n } from "@/shared/i18n/useI18n"
import { LANGUAGE_OPTIONS } from "@/shared/i18n/i18n.constants"
import type { AppLanguage } from "@/shared/i18n/i18n.types"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

function LanguageFlag({ code }: { readonly code: AppLanguage }) {
  if (code === "vi") {
    return (
      <svg
        className="h-6 w-9 rounded-sm shadow-xs shrink-0 object-cover border border-black/10"
        viewBox="0 0 30 20"
        aria-hidden="true"
      >
        <rect width="30" height="20" fill="#da251d" />
        <polygon
          points="15,4 16.5,8.7 21.4,8.7 17.5,11.6 19,16.3 15,13.4 11,16.3 12.5,11.6 8.6,8.7 13.5,8.7"
          fill="#ff0"
        />
      </svg>
    )
  }
  return (
    <svg
      className="h-6 w-9 rounded-sm shadow-xs shrink-0 object-cover border border-black/10"
      viewBox="0 0 30 20"
      aria-hidden="true"
    >
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="3" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#c8102e" strokeWidth="1.5" />
      <path d="M15 0 v20 M0 10 h30" stroke="#fff" strokeWidth="5" />
      <path d="M15 0 v20 M0 10 h30" stroke="#c8102e" strokeWidth="3" />
    </svg>
  )
}

/** Render display language switcher with localized descriptions and interactive cards. UI only. */
export function LanguageSection() {
  const { language, setLanguage, copy } = useI18n()

  return (
    <article className="surface-panel p-6 grid gap-5">
      <div className="border-b border-[var(--border)] pb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon name={ICON_NAMES.GLOBE} className="h-5 w-5 text-[var(--brand)]" />
          <span>{copy.settings.languageTitle}</span>
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">{copy.settings.languageDescription}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {LANGUAGE_OPTIONS.map((option) => {
          const isSelected = language === option.code
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code as AppLanguage)}
              className={`flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-[var(--brand)] bg-[var(--brand-soft)]/25 shadow-xs"
                  : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-subtle)]"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <LanguageFlag code={option.code} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-[var(--text)]">{option.label}</p>
                    {isSelected && (
                      <span className="rounded-full bg-[var(--brand)] text-white text-[10px] font-semibold px-2 py-0.5">
                        {language === "vi" ? "Đang chọn" : "Active"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{option.nativeLabel}</p>
                </div>
              </div>

              <input
                type="radio"
                name="app-language"
                checked={isSelected}
                onChange={() => setLanguage(option.code as AppLanguage)}
                className="mt-1 text-[var(--brand)] shrink-0"
              />
            </button>
          )
        })}
      </div>
    </article>
  )
}

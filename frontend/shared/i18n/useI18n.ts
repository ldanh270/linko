"use client"

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react"
import { APP_LANGUAGE, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "./i18n.constants"
import type { AppLanguage, I18nState } from "./i18n.types"
import { enTranslations } from "./translations/en"
import { viTranslations } from "./translations/vi"

export const I18nContext = createContext<I18nState | null>(null)

function getInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE
  try {
    const cookieMatch = document.cookie.match(/(?:^|; )linko_language=([^;]*)/)
    if (cookieMatch && (cookieMatch[1] === APP_LANGUAGE.EN || cookieMatch[1] === APP_LANGUAGE.VI)) {
      return cookieMatch[1]
    }
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored === APP_LANGUAGE.EN || stored === APP_LANGUAGE.VI) {
      return stored
    }
  } catch {
    // Storage access error fallback
  }
  return DEFAULT_LANGUAGE
}

export function useI18nProvider(): I18nState {
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = useCallback((nextLang: AppLanguage) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang)
      // Save to cookie so Next.js server-side rendering matches client language without flash
      document.cookie = `linko_language=${nextLang}; path=/; max-age=31536000; SameSite=Lax`
      document.documentElement.lang = nextLang
    } catch {
      // Storage unavailable
    }
    setLanguageState(nextLang)
  }, [])

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === APP_LANGUAGE.VI ? APP_LANGUAGE.EN : APP_LANGUAGE.VI
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
        document.cookie = `linko_language=${next}; path=/; max-age=31536000; SameSite=Lax`
        document.documentElement.lang = next
      } catch {
        // Storage unavailable
      }
      return next
    })
  }, [])

  const copy = useMemo(() => {
    return language === APP_LANGUAGE.EN ? enTranslations : viTranslations
  }, [language])

  return useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      copy,
    }),
    [language, setLanguage, toggleLanguage, copy]
  )
}

export function useI18n(): I18nState {
  const context = useContext(I18nContext)
  if (!context) {
    // Graceful fallback for components used outside provider or in isolated tests
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      toggleLanguage: () => {},
      copy: viTranslations,
    }
  }
  return context
}

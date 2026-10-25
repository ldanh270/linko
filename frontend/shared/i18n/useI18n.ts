"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { APP_LANGUAGE, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "./i18n.constants"
import type { AppLanguage, I18nState } from "./i18n.types"
import { enTranslations } from "./translations/en"
import { viTranslations } from "./translations/vi"

export const I18nContext = createContext<I18nState | null>(null)

export function useI18nProvider(): I18nState {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") return DEFAULT_LANGUAGE
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return stored === APP_LANGUAGE.EN || stored === APP_LANGUAGE.VI
      ? stored
      : DEFAULT_LANGUAGE
  })

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (nextLang: AppLanguage) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang)
    } catch {
      // Storage unavailable
    }
    setLanguageState(nextLang)
  }

  const copy = useMemo(() => {
    return language === APP_LANGUAGE.EN ? enTranslations : viTranslations
  }, [language])

  return useMemo(
    () => ({
      language,
      setLanguage,
      copy,
    }),
    [language, copy]
  )
}

export function useI18n(): I18nState {
  const context = useContext(I18nContext)
  if (!context) {
    // Graceful fallback for components used outside provider or tests
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      copy: viTranslations,
    }
  }
  return context
}

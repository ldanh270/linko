"use client"

import type { ReactNode } from "react"
import { I18nContext, useI18nProvider } from "./useI18n"

export function I18nProvider({ children }: { readonly children: ReactNode }) {
  const i18n = useI18nProvider()
  return <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
}

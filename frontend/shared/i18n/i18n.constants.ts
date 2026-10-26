import type { AppLanguage } from "./i18n.types"

export const APP_LANGUAGE = {
  VI: "vi",
  EN: "en",
} as const

export const LANGUAGE_STORAGE_KEY = "linko_language"

export const DEFAULT_LANGUAGE: AppLanguage = APP_LANGUAGE.VI

export interface LanguageOption {
  readonly code: AppLanguage
  readonly label: string
  readonly nativeLabel: string
  readonly flag: string
  readonly description: string
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  {
    code: APP_LANGUAGE.VI,
    label: "Tiếng Việt",
    nativeLabel: "Tiếng Việt (Việt Nam)",
    flag: "VN",
    description: "Ngôn ngữ mặc định của ứng dụng",
  },
  {
    code: APP_LANGUAGE.EN,
    label: "English",
    nativeLabel: "English (US)",
    flag: "EN",
    description: "International English language",
  },
] as const

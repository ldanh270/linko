import { renderHook, act } from "@testing-library/react"
import { describe, expect, it, beforeEach } from "vitest"
import type { ReactNode } from "react"
import { I18nProvider } from "./I18nProvider"
import { useI18n } from "./useI18n"
import { APP_LANGUAGE, LANGUAGE_STORAGE_KEY } from "./i18n.constants"

describe("useI18n", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = "vi"
  })

  it("defaults to Vietnamese language and copy", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>
    const { result } = renderHook(() => useI18n(), { wrapper })

    expect(result.current.language).toBe(APP_LANGUAGE.VI)
    expect(result.current.copy.navigation.inbox).toBe("Tin nhắn")
  })

  it("switches to English and persists in localStorage and html tag", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>
    const { result } = renderHook(() => useI18n(), { wrapper })

    act(() => {
      result.current.setLanguage(APP_LANGUAGE.EN)
    })

    expect(result.current.language).toBe(APP_LANGUAGE.EN)
    expect(result.current.copy.navigation.inbox).toBe("Messages")
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe(APP_LANGUAGE.EN)
    expect(document.documentElement.lang).toBe(APP_LANGUAGE.EN)
  })
})

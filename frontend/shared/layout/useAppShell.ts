"use client"

import { useTheme } from "../theme/useTheme"
import { THEME_MODE } from "../theme/theme.constants"
import { useWorkspaceNavigation } from "./useWorkspaceNavigation"
import { useI18n } from "../i18n/useI18n"

/** Prepare shell navigation, theme and language behavior independently of presentation. */
export function useAppShell() {
  const navigation = useWorkspaceNavigation()
  const { mode, setMode } = useTheme()
  const { language, toggleLanguage } = useI18n()
  const toggleTheme = () => setMode(mode === THEME_MODE.DARK ? THEME_MODE.LIGHT : THEME_MODE.DARK)
  return { ...navigation, toggleTheme, toggleLanguage, language }
}

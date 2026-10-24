"use client"

import { useTheme } from "../theme/useTheme"
import { THEME_MODE } from "../theme/theme.constants"
import { useWorkspaceNavigation } from "./useWorkspaceNavigation"

/** Prepare shell navigation and theme behavior independently of presentation. */
export function useAppShell() {
  const navigation = useWorkspaceNavigation()
  const { mode, setMode } = useTheme()
  const toggleTheme = () => setMode(mode === THEME_MODE.DARK ? THEME_MODE.LIGHT : THEME_MODE.DARK)
  return { ...navigation, toggleTheme }
}

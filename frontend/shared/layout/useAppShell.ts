"use client"

import { usePathname } from "next/navigation"
import { useTheme } from "../theme/useTheme"
import { THEME_MODE } from "../theme/theme.constants"

/** Provide navigation selection and theme action to the shell. */
export function useAppShell() {
  const pathname = usePathname()
  const { mode, setMode } = useTheme()
  const toggleTheme = () => setMode(mode === THEME_MODE.DARK ? THEME_MODE.LIGHT : THEME_MODE.DARK)
  return { pathname, toggleTheme }
}

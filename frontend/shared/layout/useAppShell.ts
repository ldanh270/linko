"use client"

import { usePathname } from "next/navigation"
import { useTheme } from "../theme/useTheme"
import { THEME_MODE } from "../theme/theme.constants"
import { APP_ROUTES } from "./route.constants"

/** Provide navigation selection and theme action to the shell. */
export function useAppShell() {
  const pathname = usePathname()
  const { mode, setMode } = useTheme()
  const toggleTheme = () => setMode(mode === THEME_MODE.DARK ? THEME_MODE.LIGHT : THEME_MODE.DARK)
  const isNavigationActive = (href: string) => pathname === href
    || (href === APP_ROUTES.GROUPS && pathname.startsWith(`${APP_ROUTES.GROUPS}/`))
    || (href === APP_ROUTES.INBOX && pathname.startsWith(`${APP_ROUTES.DIRECT}/`))
  return { pathname, toggleTheme, isNavigationActive }
}

"use client"

import type { ReactNode } from "react"

import { ThemeContext, useThemeProvider } from "./useTheme"

/** Provide color mode state to the app. UI only, logic lives in `useThemeProvider`. */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const theme = useThemeProvider()
    return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

import { THEME_MODE, THEME_STORAGE_KEY, type ThemeMode } from "./theme.constants"

/** State and actions exposed to theme controls. */
export interface ThemeState {
    mode: ThemeMode
    setMode(mode: ThemeMode): void
}

/** Shared context consumed by theme controls. */
export const ThemeContext = createContext<ThemeState | null>(null)

/** Resolve saved preferences and system changes into the document color mode. */
export function useThemeProvider(): ThemeState {
    const [mode, setMode] = useState<ThemeMode>(() => {
        if (typeof window === "undefined") return THEME_MODE.SYSTEM
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        return stored === THEME_MODE.LIGHT || stored === THEME_MODE.DARK || stored === THEME_MODE.SYSTEM
            ? stored
            : THEME_MODE.SYSTEM
    })

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)")
        const apply = () => {
            const resolved = mode === THEME_MODE.SYSTEM
                ? (media.matches ? THEME_MODE.DARK : THEME_MODE.LIGHT)
                : mode
            document.documentElement.dataset.theme = resolved
        }
        apply()
        media.addEventListener("change", apply)
        return () => media.removeEventListener("change", apply)
    }, [mode])

    const saveMode = (nextMode: ThemeMode) => {
        localStorage.setItem(THEME_STORAGE_KEY, nextMode)
        setMode(nextMode)
    }

    return useMemo(() => ({ mode, setMode: saveMode }), [mode])
}

/** Read the active theme mode and setter from the provider. */
export function useTheme(): ThemeState {
    const theme = useContext(ThemeContext)
    if (!theme) throw new Error("ThemeProvider is required")
    return theme
}

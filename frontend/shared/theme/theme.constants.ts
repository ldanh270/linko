/** User-selectable color modes. */
export const THEME_MODE = { LIGHT: "light", DARK: "dark", SYSTEM: "system" } as const

/** Local storage key for the user's theme choice. */
export const THEME_STORAGE_KEY = "linko-theme"

/** Color mode selected by the user. */
export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE]

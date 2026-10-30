"use client"

import { useTheme } from "@/shared/theme/useTheme"
import { useAccordionSection } from "@/shared/components/useAccordionSection"
import { useCurrentProfile } from "@/features/profile/hooks/useCurrentProfile"
import { useLogoutDialog } from "../components/LogoutDialog/useLogoutDialog"
import { SETTINGS_EXPLANATIONS, SETTINGS_SECTIONS, THEME_OPTIONS } from "../settings.constants"
import { useI18n } from "@/shared/i18n/useI18n"

/** Prepare supported settings, theme, chat preferences and logout actions. */
export function useSettingsPage() {
  const profileQuery = useCurrentProfile()
  const { mode, setMode } = useTheme()
  const { section, toggleSection } = useAccordionSection(SETTINGS_SECTIONS.CHAT)
  const logout = useLogoutDialog()
  const { copy } = useI18n()

  const themeOptions = [
    {
      value: THEME_OPTIONS[0].value,
      label: copy.settings.themeSystem,
      isChecked: mode === THEME_OPTIONS[0].value,
      onSelect: () => setMode(THEME_OPTIONS[0].value),
    },
    {
      value: THEME_OPTIONS[1].value,
      label: copy.settings.themeLight,
      isChecked: mode === THEME_OPTIONS[1].value,
      onSelect: () => setMode(THEME_OPTIONS[1].value),
    },
    {
      value: THEME_OPTIONS[2].value,
      label: copy.settings.themeDark,
      isChecked: mode === THEME_OPTIONS[2].value,
      onSelect: () => setMode(THEME_OPTIONS[2].value),
    },
  ]

  return {
    profile: {
      query: profileQuery,
      onRetry: () => void profileQuery.refetch(),
    },
    logout,
    section,
    themeOptions,
    explanations: SETTINGS_EXPLANATIONS.map((item) => ({
      ...item,
      isOpen: section === item.id,
      onToggle: () => toggleSection(item.id),
    })),
    onToggleChat: () => toggleSection(SETTINGS_SECTIONS.CHAT),
    onToggleLanguage: () => toggleSection(SETTINGS_SECTIONS.LANGUAGE),
    onToggleAppearance: () => toggleSection(SETTINGS_SECTIONS.APPEARANCE),
    onToggleSound: () => toggleSection(SETTINGS_SECTIONS.SOUND),
  }
}

"use client"

import { useTheme } from "@/shared/theme/useTheme"
import { useAccordionSection } from "@/shared/components/useAccordionSection"
import { useProfileEditor } from "@/features/profile/hooks/useProfileEditor"
import { useLogoutDialog } from "../components/LogoutDialog/useLogoutDialog"
import { SETTINGS_EXPLANATIONS, SETTINGS_SECTIONS, THEME_OPTIONS } from "../settings.constants"

/** Prepare supported account settings, URL disclosures and theme/logout actions. */
export function useSettingsPage() {
  const profile = useProfileEditor()
  const { mode, setMode } = useTheme()
  const { section, toggleSection } = useAccordionSection(SETTINGS_SECTIONS.PERSONAL)
  const logout = useLogoutDialog()
  return { profile, logout, section, themeOptions: THEME_OPTIONS.map((option) => ({ ...option, isChecked: option.value === mode, onSelect: () => setMode(option.value) })),
    explanations: SETTINGS_EXPLANATIONS.map((item) => ({ ...item, isOpen: section === item.id, onToggle: () => toggleSection(item.id) })),
    onTogglePersonal: () => toggleSection(SETTINGS_SECTIONS.PERSONAL), onToggleAppearance: () => toggleSection(SETTINGS_SECTIONS.APPEARANCE) }
}

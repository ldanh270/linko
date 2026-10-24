"use client"

import { useAccordionSection } from "@/shared/components/useAccordionSection"
import { useProfileEditor } from "./useProfileEditor"
import { PROFILE_SECTIONS } from "../profile.constants"

/** Own the profile panel's URL disclosures and edit-dialog visibility. */
export function useProfileSidebar() {
  const state = useProfileEditor()
  const { section, toggleSection } = useAccordionSection(PROFILE_SECTIONS.ABOUT)
  return { ...state, section, onToggleAbout: () => toggleSection(PROFILE_SECTIONS.ABOUT), onToggleFiles: () => toggleSection(PROFILE_SECTIONS.FILES) }
}

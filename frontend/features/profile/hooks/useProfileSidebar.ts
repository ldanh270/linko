"use client"

import { useProfileEditor } from "./useProfileEditor"

/** Own the profile panel's edit-dialog visibility and profile query state. */
export function useProfileSidebar() {
  return useProfileEditor()
}

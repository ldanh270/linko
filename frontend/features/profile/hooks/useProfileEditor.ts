"use client"

import { useState } from "react"
import { useProfilePage } from "./useProfilePage"

/** Share account editing and pending-dismissal behavior between profile and settings. */
export function useProfileEditor() {
  const state = useProfilePage()
  const [isEditing, setEditing] = useState(false)
  return { ...state, isEditing, onOpenEdit: () => { state.update.reset(); setEditing(true) }, onCloseEdit: () => { if (!state.update.isPending) setEditing(false) } }
}

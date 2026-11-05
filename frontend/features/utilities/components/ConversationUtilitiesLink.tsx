"use client"
import { Button } from "@/shared/components/Button"
import { useUtilityPanel } from "../hooks/useUtilityPanel"
import { UTILITY_UI } from "../utility.constants"

/** Offer the same authorized activity overview from conversation details. UI only. */
export function ConversationUtilitiesLink() {
  const panel = useUtilityPanel()
  return <Button variant="secondary" onClick={() => panel.open(UTILITY_UI.OVERVIEW)}>Lịch hẹn, bình chọn và vị trí</Button>
}

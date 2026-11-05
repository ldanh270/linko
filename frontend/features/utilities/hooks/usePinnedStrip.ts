"use client"
import { useState } from "react"
import type { MessageDto } from "@linko/contracts"
import { useMessageNavigation } from "./useMessageNavigation"

/** Own pin expansion and a deep link to the authorized original message. */
export function usePinnedStrip(pins: readonly MessageDto[]) {
  const [expanded, setExpanded] = useState(false)
  const navigation = useMessageNavigation()
  return { expanded, toggle: () => setExpanded((current) => !current), visiblePins: expanded ? pins : pins.slice(0, 1), open: navigation.openMessage }
}

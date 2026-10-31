"use client"

import { useState, useCallback } from "react"
import { CONVERSATION_KIND } from "@linko/contracts"
import { useInboxPage } from "@/features/inbox/hooks/useInboxPage"

/**
 * Coordinate state for the groups sidebar panel, including group filtering,
 * pagination and trigger state for the Create Group popup modal.
 */
export function useGroupsSidebar() {
  const pageState = useInboxPage(CONVERSATION_KIND.GROUP)
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false)

  const openCreateGroup = useCallback(() => setCreateGroupOpen(true), [])
  const closeCreateGroup = useCallback(() => setCreateGroupOpen(false), [])

  return {
    ...pageState,
    isCreateGroupOpen,
    openCreateGroup,
    closeCreateGroup,
  }
}

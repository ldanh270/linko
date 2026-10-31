"use client"

import { useState, useCallback } from "react"
import { useInboxPage } from "./useInboxPage"
import { useAddContactModal } from "@/features/people/hooks/useAddContactModal"

/**
 * Coordinate state for the inbox sidebar panel, including search filters
 * and trigger state for the Add Contact and Create Group popup modals.
 */
export function useInboxSidebar() {
  const pageState = useInboxPage()
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false)
  const addContact = useAddContactModal()

  const openCreateGroup = useCallback(() => setCreateGroupOpen(true), [])
  const closeCreateGroup = useCallback(() => setCreateGroupOpen(false), [])

  return {
    ...pageState,
    isCreateGroupOpen,
    openCreateGroup,
    closeCreateGroup,
    addContact,
  }
}

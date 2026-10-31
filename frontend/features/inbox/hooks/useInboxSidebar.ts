"use client"

import { useState, useCallback } from "react"
import { useInboxPage } from "./useInboxPage"
import { useInboxSearch } from "./useInboxSearch"
import { useAddContactModal } from "@/features/people/hooks/useAddContactModal"

/**
 * Coordinate state for the inbox sidebar panel, including Messenger-style
 * search overlay mode and trigger state for Add Contact and Create Group popup modals.
 */
export function useInboxSidebar() {
  const pageState = useInboxPage()
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false)
  const addContact = useAddContactModal()

  const openCreateGroup = useCallback(() => setCreateGroupOpen(true), [])
  const closeCreateGroup = useCallback(() => setCreateGroupOpen(false), [])

  const searchState = useInboxSearch({
    search: pageState.search,
    onSearchChange: pageState.onSearchChange,
    allRows: pageState.allRows,
  })

  return {
    ...pageState,
    isCreateGroupOpen,
    openCreateGroup,
    closeCreateGroup,
    addContact,
    searchState,
  }
}

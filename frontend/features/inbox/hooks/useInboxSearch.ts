"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { USER_SEARCH_MODE, type FriendDto } from "@linko/contracts"
import { searchPeople, openDirectChat } from "@/features/people/api/people.api"
import { PEOPLE_QUERY_KEYS } from "@/features/people/people.constants"
import { INBOX_QUERY_KEY } from "../inbox.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { normalizeSearch } from "@/shared/text/search"
import { useToast } from "@/shared/components/useToast"
import { ApiError } from "@/shared/http/ApiError"
import type { ConversationRowViewModel } from "../inbox.types"

export interface UseInboxSearchOptions {
  readonly search: string
  readonly onSearchChange: (value: string) => void
  readonly allRows: readonly ConversationRowViewModel[]
}

/**
 * Coordinate Messenger-style search overlay state:
 * - In-memory conversation filtering
 * - Server-side directory people search
 * - One-click direct chat opening
 * - Keyboard escape & exit navigation
 */
export function useInboxSearch({ search, onSearchChange, allRows }: UseInboxSearchOptions) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [openingPersonId, setOpeningPersonId] = useState<string | null>(null)

  const trimmedQuery = search.trim()
  const isSearchActive = isSearchFocused || Boolean(trimmedQuery)

  // 1. Search people query from directory
  const peopleQuery = useQuery({
    queryKey: [PEOPLE_QUERY_KEYS.SEARCH, trimmedQuery],
    queryFn: () => searchPeople({ keyword: trimmedQuery, type: USER_SEARCH_MODE.TYPING }),
    enabled: isSearchActive && trimmedQuery.length >= 1,
    staleTime: 15_000,
  })

  // 2. Matching conversations from loaded inbox
  const matchingConversations = useMemo(() => {
    if (!trimmedQuery) return []
    const normalized = normalizeSearch(trimmedQuery)
    return allRows.filter((row) =>
      normalizeSearch(`${row.title} ${row.preview}`).includes(normalized),
    )
  }, [allRows, trimmedQuery])

  // 3. Recent conversations for quick access when search input is empty
  const recentConversations = useMemo(() => {
    return allRows.slice(0, 8)
  }, [allRows])

  // 4. Matching people: remove people who already have a direct chat shown in matchingConversations
  const matchingPeople = useMemo(() => {
    const rawPeople = peopleQuery.data ?? []
    const matchedPeerIds = new Set(
      matchingConversations
        .map((c) => c.peerId)
        .filter((id): id is string => Boolean(id)),
    )
    return rawPeople.filter((p) => !matchedPeerIds.has(p.id))
  }, [peopleQuery.data, matchingConversations])

  const handleEnterSearch = useCallback(() => {
    setIsSearchFocused(true)
  }, [])

  const handleExitSearch = useCallback(() => {
    setIsSearchFocused(false)
    if (search) {
      onSearchChange("")
    }
  }, [search, onSearchChange])

  const handleClearSearch = useCallback(() => {
    onSearchChange("")
  }, [onSearchChange])

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        handleExitSearch()
      }
    },
    [handleExitSearch],
  )

  // 5. Click on a contact to start / open direct chat
  const handleSelectPerson = useCallback(
    async (person: FriendDto) => {
      if (openingPersonId) return
      setOpeningPersonId(person.id)
      try {
        const directChat = await openDirectChat(person.id)
        await queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY })
        handleExitSearch()
        router.push(buildAppRoute(APP_ROUTES.DIRECT_CONVERSATION, { conversationId: directChat.id }))
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : "Không thể mở cuộc trò chuyện. Vui lòng thử lại."
        toast.show(msg, "error")
      } finally {
        setOpeningPersonId(null)
      }
    },
    [openingPersonId, queryClient, handleExitSearch, router, toast],
  )

  return {
    isSearchActive,
    isSearchFocused,
    matchingConversations,
    recentConversations,
    matchingPeople,
    isSearchingPeople: peopleQuery.isFetching,
    openingPersonId,
    handleEnterSearch,
    handleExitSearch,
    handleClearSearch,
    handleSearchKeyDown,
    handleSelectPerson,
  }
}

"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { FRIEND_REQUEST_DIRECTION, USER_SEARCH_MODE } from "@linko/contracts"
import { listFriends, listFriendRequests, searchPeople } from "../api/people.api"
import { PEOPLE_LIMITS, PEOPLE_QUERY_KEYS } from "../people.constants"
import { useFriendActions } from "./useFriendActions"

/**
 * Encapsulate state, queries and actions for the standalone Add Contact popup modal.
 * Can be opened from anywhere (InboxSidebar, ContactsSidebar, etc.) without leaving the current page.
 */
export function useAddContactModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState("")
  const actions = useFriendActions()

  const friends = useQuery({
    queryKey: [PEOPLE_QUERY_KEYS.FRIENDS],
    queryFn: listFriends,
    enabled: isOpen,
  })

  const requests = useQuery({
    queryKey: [PEOPLE_QUERY_KEYS.REQUESTS, FRIEND_REQUEST_DIRECTION.RECEIVED],
    queryFn: () => listFriendRequests(FRIEND_REQUEST_DIRECTION.RECEIVED),
    enabled: isOpen,
  })

  const results = useQuery({
    queryKey: [PEOPLE_QUERY_KEYS.SEARCH, keyword],
    queryFn: () => searchPeople({ keyword, type: USER_SEARCH_MODE.FULL }),
    enabled: isOpen && keyword.trim().length >= PEOPLE_LIMITS.MIN_SEARCH_LENGTH,
  })

  const searchRows = [
    ...new Map((results.data ?? []).map((person) => [person.id, person])).values(),
  ].map((person) => ({
    ...person,
    isRequested: actions.requestedIds.has(person.id),
    isFriend: friends.data?.some((friend) => friend.id === person.id) ?? false,
    onRequest: () => actions.request.mutate({ recipientId: person.id }),
  }))

  const requestRows = (requests.data ?? []).map((item) => ({
    ...item,
    onAccept: () => actions.accept.mutate(item.id),
    onDecline: () => actions.decline.mutate(item.id),
  }))

  const onOpen = () => setIsOpen(true)
  const onClose = () => {
    setIsOpen(false)
    setKeyword("")
  }

  return {
    isOpen,
    onOpen,
    onClose,
    onCloseAdd: onClose,
    keyword,
    keywordRevision: 0,
    onKeywordChange: setKeyword,
    results,
    requests,
    searchRows,
    requestRows,
    actions,
    onRetrySearch: () => void results.refetch(),
  }
}

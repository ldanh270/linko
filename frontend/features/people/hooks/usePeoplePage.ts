"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { FRIEND_REQUEST_DIRECTION, USER_SEARCH_MODE, USER_SEARCH_QUERY_PARAMS } from "@linko/contracts"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { OBJECT_ID_PATTERN, WORKSPACE_PARAMS } from "@/shared/layout/workspace.constants"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { getPublicUser } from "@/features/profile/api/profile.api"
import { listFriends, listFriendRequests, searchPeople } from "../api/people.api"
import { PEOPLE_LIMITS, PEOPLE_PARAMS, PEOPLE_QUERY_KEYS } from "../people.constants"
import { groupContacts } from "../people.mapper"
import { useFriendActions } from "./useFriendActions"

/** Coordinate contacts, search, requests and URL-selected public profile views. */
export function usePeoplePage() {
  const router = useRouter()
  const actions = useFriendActions()
  const [isAdding, setAdding] = useState(false)
  const { value: search, setValue: setSearch, revision: searchRevision } = useQueryParamState(WORKSPACE_PARAMS.SEARCH, z.string(), "")
  const { value: keyword, setValue: setKeyword, revision: keywordRevision } = useQueryParamState(USER_SEARCH_QUERY_PARAMS.KEYWORD, z.string(), "")
  const { value: userId, setValue: setUserId } = useQueryParamState(PEOPLE_PARAMS.USER, z.string().regex(OBJECT_ID_PATTERN), "")
  const friends = useQuery({ queryKey: [PEOPLE_QUERY_KEYS.FRIENDS], queryFn: listFriends })
  const requests = useQuery({ queryKey: [PEOPLE_QUERY_KEYS.REQUESTS, FRIEND_REQUEST_DIRECTION.RECEIVED], queryFn: () => listFriendRequests(FRIEND_REQUEST_DIRECTION.RECEIVED) })
  const results = useQuery({ queryKey: [PEOPLE_QUERY_KEYS.SEARCH, keyword], queryFn: () => searchPeople({ keyword, type: USER_SEARCH_MODE.FULL }), enabled: isAdding && keyword.trim().length >= PEOPLE_LIMITS.MIN_SEARCH_LENGTH })
  const profile = useQuery({ queryKey: [PEOPLE_QUERY_KEYS.PROFILE, userId], queryFn: () => getPublicUser(userId), enabled: Boolean(userId) })
  const groups = groupContacts(friends.data ?? [], search).map((group) => ({ ...group, contacts: group.contacts.map((person) => ({
    id: person.id, name: person.displayName || person.username, onOpen: () => actions.openChat.mutate(person.id),
    isOpening: actions.openChat.isPending,
    menu: [
      { label: "Nhắn tin", icon: ICON_NAMES.CHAT, disabled: actions.openChat.isPending, onSelect: () => actions.openChat.mutate(person.id) },
      { label: "Xem hồ sơ", icon: ICON_NAMES.PROFILE, onSelect: () => router.push(buildAppRoute(APP_ROUTES.USER_PROFILE, { userId: person.id })) },
    ],
  })) }))
  const searchRows = [...new Map((results.data ?? []).map((person) => [person.id, person])).values()].map((person) => ({
    ...person, isRequested: actions.requestedIds.has(person.id), isFriend: friends.data?.some((friend) => friend.id === person.id) ?? false,
    onRequest: () => actions.request.mutate({ recipientId: person.id }),
  }))
  const requestRows = (requests.data ?? []).map((item) => ({ ...item, onAccept: () => actions.accept.mutate(item.id), onDecline: () => actions.decline.mutate(item.id) }))
  return { groups, friends, requests, results, profile, userId, searchRows, requestRows, actions, isAdding, keyword, search, searchRevision, keywordRevision,
    onSearchChange: (value: string) => setSearch(value, { history: "replace", debounceMs: PEOPLE_LIMITS.DEBOUNCE_MS }),
    onKeywordChange: (value: string) => setKeyword(value, { history: "replace", debounceMs: PEOPLE_LIMITS.DEBOUNCE_MS }),
    onOpenAdd: () => setAdding(true), onCloseAdd: () => setAdding(false), onCloseProfile: () => setUserId(""), onRetry: () => void friends.refetch(), onRetrySearch: () => void results.refetch() }
}

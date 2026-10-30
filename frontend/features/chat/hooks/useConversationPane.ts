"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { CONVERSATION_TYPE, type InboxItemDto, INBOX_FIELDS, USER_PROFILE_FIELDS, PIN_LIMITS, SOCKET_EVENTS } from "@linko/contracts"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { WORKSPACE_PARAMS } from "@/shared/layout/workspace.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { useWorkspaceNavigation } from "@/shared/layout/useWorkspaceNavigation"
import { useCurrentProfile } from "@/features/profile/hooks/useCurrentProfile"
import { clearInboxItemUnreadCount } from "@/features/inbox/inbox.cache"
import { listMembers } from "@/features/membership/api/membership.api"
import { useConversationChat } from "./useConversationChat"
import { useGroupPins } from "./useGroupPins"
import { useMessageComposer } from "./useMessageComposer"
import { useConversationDetails } from "./useConversationDetails"
import { useTypingIndicator } from "./useTypingIndicator"
import { getSharedChatSocket } from "../api/chatSocket"
import { mapTimeline } from "../chat.mapper"
import { CHAT_ACCESS_ERRORS, CHAT_COPY, CHAT_KIND, CHAT_QUERY_KEYS } from "../chat.constants"
import { ApiError } from "@/shared/http/ApiError"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

/** Prepare conversation data and callbacks without coupling JSX to query/mutation details. */
export function useConversationPane(item: InboxItemDto) {
  const id = item[INBOX_FIELDS.ID]
  const kind = item[INBOX_FIELDS.TYPE] === CONVERSATION_TYPE.GROUP ? CHAT_KIND.GROUP : CHAT_KIND.DIRECT
  const { query, messages, send } = useConversationChat(id)
  const profile = useCurrentProfile()
  const { backHref } = useWorkspaceNavigation()
  const router = useRouter()
  const pins = useGroupPins(id, kind === CHAT_KIND.GROUP)
  const members = useQuery({ queryKey: [CHAT_QUERY_KEYS.MEMBERS, id], queryFn: () => listMembers(id), enabled: kind === CHAT_KIND.GROUP })
  const isHistoryAccessDenied = query.error instanceof ApiError && CHAT_ACCESS_ERRORS.has(query.error.code)
  const isIdentityAccessDenied = profile.error instanceof ApiError && CHAT_ACCESS_ERRORS.has(profile.error.code)
  const isHistoryUnavailable = (query.isError && !query.data) || isHistoryAccessDenied
  const isIdentityUnavailable = (profile.isError && !profile.data) || isIdentityAccessDenied
  const isComposerDisabled = !query.data || !profile.data || isHistoryUnavailable || isIdentityUnavailable

  const queryClient = useQueryClient()
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (id) {
      clearInboxItemUnreadCount(queryClient, id)
    }
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      getSharedChatSocket().emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: id })
    }
  }, [id, queryClient])

  const emitTyping = () => {
    getSharedChatSocket().emit(SOCKET_EVENTS.TYPING_START, { conversationId: id })
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      getSharedChatSocket().emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: id })
    }, 2500)
  }

  const stopTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    getSharedChatSocket().emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: id })
  }

  const composer = useMessageComposer({
    kind,
    isSending: send.isPending,
    isDisabled: isComposerDisabled,
    onTyping: emitTyping,
    onSend: (req, cb) => {
      stopTyping()
      send.mutate(req, cb)
    },
  })
  const pinnedIds = new Set(pins.query.data?.map((message) => message.id) ?? [])
  const authors = item.participants.map((person) => ({ id: person.id, name: person.displayName ?? CHAT_COPY.MEMBER, avatarUrl: person.avatarUrl }))
  if (profile.data) authors.push({ id: profile.data[USER_PROFILE_FIELDS.ID], name: profile.data[USER_PROFILE_FIELDS.DISPLAY_NAME], avatarUrl: profile.data[USER_PROFILE_FIELDS.AVATAR_URL] })
  for (const member of members.data ?? []) if (!authors.some((author) => author.id === member.userId)) authors.push({ id: member.userId, name: member.displayName ?? CHAT_COPY.MEMBER, avatarUrl: null })
  const rows = mapTimeline({ messages, currentUserId: profile.data?.id ?? "", authors, pinnedIds })
  const peer = item.participants.find((person) => person.id !== profile.data?.id)
  const title = item.group?.name ?? peer?.displayName ?? CHAT_COPY.PRIVATE
  const avatarUrl = kind === CHAT_KIND.GROUP ? item.group?.avatarUrl ?? null : peer?.avatarUrl
  const { typingUserIds } = useTypingIndicator(id, profile.data?.id)
  const typingNames = typingUserIds
    .map((userId) => authors.find((author) => author.id === userId)?.name || "Ai đó")
    .join(", ")
  const { value: search, setValue: setSearch, revision: searchRevision } = useQueryParamState(WORKSPACE_PARAMS.MESSAGE_SEARCH, z.string(), "")
  const [isSearchOpen, setSearchOpen] = useState(false)
  const onSearchChange = (value: string) => setSearch(value, { history: "replace", debounceMs: 200 })

  const [activeMatchIndex, setActiveMatchIndex] = useState(0)

  const searchMatches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return rows
      .filter((row) => row.content.toLowerCase().includes(q))
      .map((row) => ({
        id: row.id,
        content: row.content,
        author: row.author,
        time: row.time,
      }))
  }, [search, rows])

  useEffect(() => {
    setActiveMatchIndex(0)
  }, [search])

  const activeMatch = searchMatches[activeMatchIndex] ?? null
  const activeMatchId = activeMatch?.id ?? null

  useEffect(() => {
    if (!activeMatchId) return
    const el = document.querySelector(`[data-message-id="${activeMatchId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [activeMatchId])

  const onNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return
    setActiveMatchIndex((current) => (current + 1) % searchMatches.length)
  }, [searchMatches.length])

  const onPrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return
    setActiveMatchIndex((current) => (current - 1 + searchMatches.length) % searchMatches.length)
  }, [searchMatches.length])

  const onSelectMatch = useCallback((index: number) => {
    if (index >= 0 && index < searchMatches.length) {
      setActiveMatchIndex(index)
    }
  }, [searchMatches.length])

  const onCloseSearch = useCallback(() => {
    setSearch("")
    setSearchOpen(false)
  }, [setSearch])

  const onToggleSearch = useCallback(() => {
    if (isSearchOpen || Boolean(search)) {
      onCloseSearch()
    } else {
      setSearchOpen(true)
    }
  }, [isSearchOpen, search, onCloseSearch])

  const { value: isDetailsOpenRaw, setValue: setDetailsOpenRaw } = useQueryParamState(
    WORKSPACE_PARAMS.DETAILS,
    z.enum(["true", "false", "1", "0"]),
    "false"
  )
  const isDetailsOpen = isDetailsOpenRaw === "true" || isDetailsOpenRaw === "1"
  const onToggleDetails = () => setDetailsOpenRaw(isDetailsOpen ? "false" : "true")
  const onCloseDetails = () => setDetailsOpenRaw("false")

  const details = useConversationDetails({
    item,
    kind,
    messages,
    membersData: members.data,
    pinsData: pins.query.data,
    authors,
    currentUserId: profile.data?.id ?? "",
    isOpen: isDetailsOpen,
    onClose: onCloseDetails,
    onOpenSearch: () => setSearchOpen(true),
  })

  const actions = kind === CHAT_KIND.GROUP ? [
    { label: "Thông tin nhóm", icon: ICON_NAMES.GROUP, onSelect: onToggleDetails },
    { label: "Lời mời", icon: ICON_NAMES.ADD_CONTACT, onSelect: () => router.push(buildAppRoute(APP_ROUTES.GROUP_INVITATIONS, { conversationId: id })) },
  ] : [
    { label: "Chi tiết cuộc trò chuyện", icon: ICON_NAMES.PROFILE, onSelect: onToggleDetails },
    { label: "Bạn bè", icon: ICON_NAMES.CONTACTS, onSelect: () => router.push(APP_ROUTES.PEOPLE) },
  ]
  const onPin = (messageId: string, isPinned: boolean) => pins.update.mutate({ messageId, isPinned })
  const actionRows = rows.map((row) => ({
    ...row,
    isSearchActive: row.id === activeMatchId,
    searchQuery: search.trim() ? search : undefined,
    actions: [
      { label: CHAT_COPY.REPLY, icon: ICON_NAMES.REPLY, onSelect: () => composer.onReply(row.id) },
      ...(kind === CHAT_KIND.GROUP ? [{ label: row.isPinned ? CHAT_COPY.UNPIN : CHAT_COPY.PIN, icon: ICON_NAMES.PIN, disabled: pins.update.isPending || (!row.isPinned && pinnedIds.size >= PIN_LIMITS.MAX_PINNED_MESSAGES), onSelect: () => onPin(row.id, row.isPinned) }] : []),
    ],
  }))
  const replyTargetRow = composer.replyId ? rows.find((row) => row.id === composer.replyId) : null
  const composerState = {
    ...composer,
    replyTarget: replyTargetRow ? {
      author: replyTargetRow.author,
      content: replyTargetRow.content || (replyTargetRow.attachments.length ? "Đính kèm tệp" : ""),
    } : null,
  }
  return {
    conversationId: id,
    query,
    profile,
    composer: composerState,
    members,
    pins,
    kind,
    details,
    isComposerDisabled,
    isHistoryUnavailable,
    isIdentityUnavailable,
    header: {
      title,
      avatarUrl,
      peerId: peer?.id,
      backHref,
      actions,
      isSearchOpen: isSearchOpen || Boolean(search),
      onToggleSearch,
      search,
      searchRevision,
      onSearchChange,
      isDetailsOpen,
      onToggleDetails,
    },
    searchState: {
      isOpen: isSearchOpen || Boolean(search),
      query: search,
      matches: searchMatches,
      activeIndex: activeMatchIndex,
      activeMatchId,
      onChange: onSearchChange,
      onNext: onNextMatch,
      onPrev: onPrevMatch,
      onSelectMatch,
      onClose: onCloseSearch,
      hasMoreHistory: Boolean(query.hasNextPage),
      isLoadingMore: Boolean(query.isFetchingNextPage),
      onLoadMoreHistory: () => void query.fetchNextPage(),
    },
    typingNames,
    rows: actionRows,
  }
}

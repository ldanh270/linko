"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CONVERSATION_KIND, CONVERSATION_TYPE, CONVERSATION_QUERY_PARAMS, type ConversationKind } from "@linko/contracts"
import { z } from "zod"
import { useQueryParamState } from "@/shared/url/useQueryParamState"
import { WORKSPACE_PARAMS } from "@/shared/layout/workspace.constants"
import { useCurrentProfile } from "@/features/profile/hooks/useCurrentProfile"
import { useWorkspaceNavigation } from "@/shared/layout/useWorkspaceNavigation"
import { usePresence } from "@/shared/presence/usePresence"
import { listInbox } from "../api/inbox.api"
import { INBOX_QUERY_KEY, INBOX_FILTERS } from "../inbox.constants"
import { mapConversationRow } from "../inbox.mapper"
import { normalizeSearch } from "@/shared/text/search"

const KIND_SCHEMA = z.enum([CONVERSATION_KIND.ALL, CONVERSATION_KIND.GROUP, CONVERSATION_KIND.DIRECT])

/** Own shared inbox/group listing queries, URL filters and compact row mapping. */
export function useInboxPage(fixedKind?: ConversationKind) {
  const router = useRouter(), pathname = usePathname(), params = useSearchParams()
  const profile = useCurrentProfile()
  const { conversationId } = useWorkspaceNavigation()
  const { value: kindFromUrl } = useQueryParamState(CONVERSATION_QUERY_PARAMS.KIND, KIND_SCHEMA, CONVERSATION_KIND.ALL)
  const [activeKind, setActiveKind] = useState<ConversationKind>(fixedKind ?? kindFromUrl)

  useEffect(() => {
    setActiveKind(fixedKind ?? kindFromUrl)
  }, [fixedKind, kindFromUrl])

  const effectiveKind = fixedKind ?? activeKind
  const { value: cursor, setValue: setCursor } = useQueryParamState(CONVERSATION_QUERY_PARAMS.CURSOR, z.string(), "")
  const { value: search, setValue: setSearch, revision: searchRevision, cancelPending: cancelSearch } = useQueryParamState(WORKSPACE_PARAMS.SEARCH, z.string(), "")
  const query = useQuery({ queryKey: [...INBOX_QUERY_KEY, effectiveKind, cursor], queryFn: ({ signal }) => listInbox({ kind: effectiveKind, cursor: cursor || undefined, signal }) })
  const recentPeopleQuery = useQuery({
    queryKey: [...INBOX_QUERY_KEY, "recent-direct-people"],
    queryFn: ({ signal }) => listInbox({ kind: CONVERSATION_KIND.DIRECT, limit: 6, signal }),
    enabled: fixedKind !== CONVERSATION_KIND.GROUP,
    staleTime: 30_000,
  })
  const rows = (query.data?.items ?? []).map((item) => mapConversationRow(item, profile.data?.id ?? ""))
  const visibleRows = search ? rows.filter((row) => normalizeSearch(`${row.title} ${row.preview}`).includes(normalizeSearch(search))) : rows
  const peopleItems = recentPeopleQuery.data?.items ?? (effectiveKind !== CONVERSATION_KIND.GROUP ? (query.data?.items ?? []).filter((item) => item.type === CONVERSATION_TYPE.DIRECT) : [])
  const people = peopleItems.map((item) => mapConversationRow(item, profile.data?.id ?? "")).slice(0, 6)

  const peerIds = Array.from(new Set([
    ...people.map((p) => p.peerId).filter((id): id is string => Boolean(id)),
    ...visibleRows.map((r) => r.peerId).filter((id): id is string => Boolean(id)),
  ]))
  const presence = usePresence(peerIds)

  const changeKind = (value: ConversationKind) => {
    cancelSearch()
    setActiveKind(value)
    if (typeof window !== "undefined") {
      const next = new URLSearchParams(window.location.search)
      next.delete(CONVERSATION_QUERY_PARAMS.CURSOR)
      if (value === CONVERSATION_KIND.ALL) next.delete(CONVERSATION_QUERY_PARAMS.KIND)
      else next.set(CONVERSATION_QUERY_PARAMS.KIND, value)
      const qs = next.toString()
      const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`
      window.history.replaceState(null, "", nextUrl)
    }
  }
  const onSearchChange = (value: string) => {
    setSearch(value, { history: "replace", debounceMs: 250, resetKeys: [CONVERSATION_QUERY_PARAMS.CURSOR] })
  }
  return {
    query,
    rows: visibleRows,
    allRows: rows,
    people,
    search,
    searchRevision,
    onSearchChange,
    conversationId,
    onRetry: () => void query.refetch(),
    onLoadMore: () => { cancelSearch(); setCursor(query.data?.nextCursor ?? "") },
    filters: INBOX_FILTERS.map((filter) => ({ ...filter, isActive: effectiveKind === filter.value, onSelect: () => changeKind(filter.value) })),
    isOnline: (peerId?: string | null) => presence.isOnline(peerId),
  }
}

"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CONVERSATION_KIND } from "@linko/contracts"
import { useWorkspaceNavigation } from "@/shared/layout/useWorkspaceNavigation"
import { listInbox } from "../api/inbox.api"
import { INBOX_QUERY_KEY } from "../inbox.constants"
import { findSelectedConversation } from "../inbox.selection"

/** Resolve a URL-selected accessible conversation beyond the first inbox page. */
export function useSelectedConversation() {
  const { conversationId, isConversationView } = useWorkspaceNavigation()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: [...INBOX_QUERY_KEY, "selected", conversationId], enabled: Boolean(conversationId),
    queryFn: ({ signal }) => findSelectedConversation(conversationId, (cursor) => client.fetchQuery({
      queryKey: [...INBOX_QUERY_KEY, CONVERSATION_KIND.ALL, cursor ?? ""],
      queryFn: () => listInbox({ kind: CONVERSATION_KIND.ALL, cursor, signal }), staleTime: 30_000,
    })),
  })
  return { conversationId, isConversationView, query }
}

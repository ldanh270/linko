import { useQuery } from "@tanstack/react-query"
import { CONVERSATION_KIND } from "@linko/contracts"
import { listInbox } from "../api/inbox.api"
import { INBOX_QUERY_KEY } from "../inbox.constants"

/**
 * Load the first inbox page for the persistent conversation sidebar.
 *
 * @returns The query state used to render conversation rows and retry failures.
 */
export function useInboxSidebar() {
  return useQuery({
    queryKey: [...INBOX_QUERY_KEY, CONVERSATION_KIND.ALL, ""],
    queryFn: ({ signal }) => listInbox({ kind: CONVERSATION_KIND.ALL, signal }),
  })
}

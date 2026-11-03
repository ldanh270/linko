import { CONVERSATION_TYPE, INBOX_FIELDS, type CursorPage, type InboxItemDto } from "@linko/contracts"
import type { QueryClient } from "@tanstack/react-query"
import { listInbox } from "@/features/inbox/api/inbox.api"
import { INBOX_QUERY_KEY } from "@/features/inbox/inbox.constants"
import { APP_ROUTES, buildAppRoute } from "@/shared/layout/route.constants"
import { withConversation } from "@/shared/layout/workspace.navigation"

/** Resolve the actual conversation type; unknown or inaccessible rooms safely open the inbox. */
export async function resolveNotificationRoute(client: QueryClient, conversationId: string): Promise<string> {
  const cached = client.getQueriesData<CursorPage<InboxItemDto>>({ queryKey: INBOX_QUERY_KEY })
    .flatMap(([, page]) => page?.items ?? []).find((item) => item[INBOX_FIELDS.ID] === conversationId)
  if (cached) return conversationRoute(cached)
  try {
    const page = await listInbox()
    const conversation = page.items.find((item) => item[INBOX_FIELDS.ID] === conversationId)
    if (conversation) return conversationRoute(conversation)
  } catch {
    /** Inbox navigation preserves selection even if the detail lookup is temporarily unavailable. */
  }
  return withConversation(APP_ROUTES.INBOX, conversationId)
}

function conversationRoute(item: InboxItemDto): string {
  const route = item[INBOX_FIELDS.TYPE] === CONVERSATION_TYPE.GROUP ? APP_ROUTES.GROUP_CONVERSATION : APP_ROUTES.DIRECT_CONVERSATION
  return buildAppRoute(route, { conversationId: item[INBOX_FIELDS.ID] })
}

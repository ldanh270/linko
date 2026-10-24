"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { APP_NAVIGATION } from "./navigation.constants"
import { APP_ROUTES } from "./route.constants"
import { WORKSPACE_PARAMS } from "./workspace.constants"
import { getWorkspaceLocation, withConversation } from "./workspace.navigation"

/** Prepare route-aware destinations while preserving the selected conversation in the URL. */
export function useWorkspaceNavigation() {
  const pathname = usePathname()
  const params = useSearchParams()
  const location = getWorkspaceLocation(pathname, params.get(WORKSPACE_PARAMS.CONVERSATION))
  const links = APP_NAVIGATION.map((item) => ({ ...item, destination: withConversation(item.href, location.conversationId), isActive: pathname === item.href || (item.href === APP_ROUTES.INBOX && location.isConversationView) }))
  return { ...location, links, backHref: withConversation(APP_ROUTES.INBOX, location.conversationId) }
}

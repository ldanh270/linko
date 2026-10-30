"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useI18n } from "@/shared/i18n/useI18n"
import { APP_NAVIGATION, MOBILE_NAVIGATION } from "./navigation.constants"
import { APP_ROUTES } from "./route.constants"
import { WORKSPACE_PARAMS } from "./workspace.constants"
import { getWorkspaceLocation, withConversation } from "./workspace.navigation"

/** Prepare route-aware destinations while preserving the selected conversation in the URL. */
export function useWorkspaceNavigation() {
  const pathname = usePathname()
  const params = useSearchParams()
  const { copy } = useI18n()
  const location = getWorkspaceLocation(pathname, params.get(WORKSPACE_PARAMS.CONVERSATION))

  const getLocalizedLabel = (href: string, fallback: string) => {
    switch (href) {
      case APP_ROUTES.INBOX:
        return copy.navigation.inbox
      case APP_ROUTES.PEOPLE:
        return copy.navigation.people
      case APP_ROUTES.NOTIFICATIONS:
        return copy.navigation.notifications
      case APP_ROUTES.SETTINGS:
        return copy.navigation.settings
      case APP_ROUTES.PROFILE:
        return copy.navigation.profile
      default:
        return fallback
    }
  }

  const links = APP_NAVIGATION.map((item) => ({
    ...item,
    label: getLocalizedLabel(item.href, item.label),
    destination: withConversation(item.href, location.conversationId),
    isActive: pathname === item.href || (item.href === APP_ROUTES.INBOX && location.isConversationView),
  }))
  const mobileLinks = MOBILE_NAVIGATION.map((item) => ({
    ...item,
    label: getLocalizedLabel(item.href, item.label),
    destination: withConversation(item.href, location.conversationId),
    isActive: pathname === item.href || (item.href === APP_ROUTES.INBOX && location.isConversationView),
  }))
  return { ...location, links, mobileLinks, backHref: withConversation(APP_ROUTES.INBOX, location.conversationId) }
}

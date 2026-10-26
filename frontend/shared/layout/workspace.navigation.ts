import { APP_ROUTES } from "./route.constants"
import { OBJECT_ID_PATTERN, WORKSPACE_PARAMS } from "./workspace.constants"

/** Primary standalone routes that display full-page details rather than a messenger workspace. */
export const FULL_PAGE_ROUTES = new Set<string>([
  APP_ROUTES.PROFILE,
  APP_ROUTES.PEOPLE,
  APP_ROUTES.SETTINGS,
  APP_ROUTES.NOTIFICATIONS,
])

/** Derive workspace selection while keeping non-chat panels visible on small screens. */
export function getWorkspaceLocation(pathname: string, querySelection: string | null) {
  const segments = pathname.split("/")
  const isConversationView = segments.length === 3 && (segments[1] === "direct" || segments[1] === "groups") && segments[2] !== "new"
  const candidate = isConversationView ? segments[2] : querySelection
  const conversationId = candidate && OBJECT_ID_PATTERN.test(candidate) ? candidate : ""
  const isFullPage = FULL_PAGE_ROUTES.has(pathname) || pathname.startsWith("/profile/")
  const isDetail = isFullPage || pathname.startsWith(APP_ROUTES.ATTACHMENT.split("/:")[0]) || pathname === APP_ROUTES.GROUP_CREATE || segments.length > 3
  return { conversationId, isConversationView, isDetail }
}

/** Carry only a valid conversation ID to another primary panel. */
export function withConversation(href: string, conversationId: string): string {
  if (!OBJECT_ID_PATTERN.test(conversationId)) return href
  return `${href}?${new URLSearchParams({ [WORKSPACE_PARAMS.CONVERSATION]: conversationId })}`
}

/** Public application routes shared by navigation, feature actions, and redirects. */
export const APP_ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  INBOX: "/inbox",
  GROUPS: "/groups",
  GROUP_CREATE: "/groups/new",
  GROUP_CONVERSATION: "/groups/:conversationId",
  GROUP_INFO: "/groups/:conversationId/info",
  GROUP_MANAGE: "/groups/:conversationId/manage",
  GROUP_INVITATIONS: "/groups/:conversationId/invitations",
  DIRECT: "/direct",
  DIRECT_CONVERSATION: "/direct/:conversationId",
  PEOPLE: "/people",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  ATTACHMENT: "/attachments/:messageId/:attachmentId",
  INVITATION: "/invite/:token",
} as const

/** Replace named route segments with URL-encoded identifiers. */
export function buildAppRoute(route: string, params: Readonly<Record<string, string>>): string {
  return Object.entries(params).reduce((path, [name, value]) => path.replace(`:${name}`, encodeURIComponent(value)), route)
}

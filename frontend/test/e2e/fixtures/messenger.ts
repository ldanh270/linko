import type { Page, Route } from "@playwright/test"
import { API_ROUTES, AUTH_ROUTE_PATHS, USER_ROUTE_PATHS, CONVERSATION_TYPE, CONVERSATION_STATUS, FRIEND_ROUTE_PATHS, type ProfileDto, type FriendDto, type InboxItemDto, type MessageDto } from "@linko/contracts"

/** Deterministic public identifiers used exclusively by browser fixtures. */
export const FIXTURE_IDS = { SELF: "aaaaaaaaaaaaaaaaaaaaaaaa", PEER: "bbbbbbbbbbbbbbbbbbbbbbbb", DIRECT: "cccccccccccccccccccccccc", GROUP: "dddddddddddddddddddddddd" } as const
/** Private fixture identity provides real sender ownership to the UI. */
export const FIXTURE_PROFILE: ProfileDto = { id: FIXTURE_IDS.SELF, displayName: "Patricia Smith", username: "patricia.smith", email: "adc@123.com", phone: null, bio: "Nếu nhiều ngôn ngữ cùng hội tụ, ngữ pháp của ngôn ngữ mới sẽ đơn giản và dễ hiểu hơn.", avatarUrl: "/test-avatar-self.jpg", backgroundUrl: null }
/** Public fixture contact follows the actual redacted API contract. */
export const FIXTURE_PEER: FriendDto = { id: FIXTURE_IDS.PEER, displayName: "Doris Brown", username: "doris.brown", bio: "Hey! there I'm available", avatarUrl: "/test-avatar-peer.jpg", backgroundUrl: null }
const CREATED_AT = "2026-10-24T03:00:00.000Z"
const PARTICIPANTS = [{ id: FIXTURE_IDS.SELF, displayName: FIXTURE_PROFILE.displayName, avatarUrl: FIXTURE_PROFILE.avatarUrl, joinedAt: CREATED_AT }, { id: FIXTURE_PEER.id, displayName: FIXTURE_PEER.displayName, avatarUrl: FIXTURE_PEER.avatarUrl, joinedAt: CREATED_AT }]

/** Typed fixture conversations cover both canonical routes without production demo fallbacks. */
export const FIXTURE_CONVERSATIONS: readonly InboxItemDto[] = [
  { id: FIXTURE_IDS.DIRECT, type: CONVERSATION_TYPE.DIRECT, status: CONVERSATION_STATUS.ACTIVE, participants: PARTICIPANTS, group: null, unreadCount: 2, lastMessage: { id: "111111111111111111111111", sender: FIXTURE_PEER, content: "Nice to meet you", createdAt: CREATED_AT }, createdAt: CREATED_AT, updatedAt: CREATED_AT },
  ...["General", "Reporting", "Designers", "Developers", "Project-alpha", "Snacks"].map((name, index): InboxItemDto => ({ id: index ? `${index}`.padStart(24, "0") : FIXTURE_IDS.GROUP, type: CONVERSATION_TYPE.GROUP, status: CONVERSATION_STATUS.ACTIVE, participants: PARTICIPANTS, group: { name, description: null, avatarUrl: null }, unreadCount: index === 1 ? 23 : 0, lastMessage: null, createdAt: CREATED_AT, updatedAt: CREATED_AT })),
]

/** Create chronological messages with alternating actual sender IDs. */
export function fixtureMessages(conversationId = FIXTURE_IDS.DIRECT): MessageDto[] {
  return ["Good morning", "Good morning, How are you? What about our next meeting?", "Yeah everything is fine", "& Next meeting tomorrow 10.00AM", "Wow that's great"].map((content, index) => ({
    id: `${index + 10}`.padStart(24, "0"), conversationId, senderId: index === 1 || index === 4 ? FIXTURE_IDS.SELF : FIXTURE_IDS.PEER, clientMessageId: `fixture-${index}`, content, replyTo: null, mentions: [], attachments: [],
    createdAt: `2026-10-${index < 2 ? "23" : "24"}T03:0${index}:00.000Z`, updatedAt: CREATED_AT,
  }))
}

/** Fixture configuration supports focused error and retry scenarios. */
export interface MessengerFixtureOptions { readonly failFirstSend?: boolean; readonly failFriends?: boolean; readonly failProfile?: boolean; readonly failProfileRefetch?: boolean; readonly failOlderHistory?: boolean; readonly laterSelection?: boolean }

/** Install deterministic API responses, preserving network-independent browser behavior. */
export async function installMessengerFixtures(page: Page, options: MessengerFixtureOptions = {}) {
  let profile = { ...FIXTURE_PROFILE }, attempts = 0, profileLoads = 0
  const requests: { content: string; clientMessageId: string }[] = []
  const readRequests: string[] = []
  const histories = new Map<string, MessageDto[]>()
  const fulfill = (route: Route, value: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ success: true, data: value, error: null, meta: null }) })
  await page.route("**/socket.io/**", (route) => route.abort())
  await page.route("**/test-avatar-*.jpg", (route) => route.fulfill({ path: new URL(route.request().url()).pathname.includes("self") ? "test/e2e/fixtures/self.jpg" : "test/e2e/fixtures/peer.jpg", contentType: "image/jpeg" }))
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url()), path = url.pathname, method = route.request().method()
    if (path === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`) return fulfill(route, { accessToken: "fixture-token" })
    if (path === `${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.LOGOUT}`) return fulfill(route, null)
    if (path === `${API_ROUTES.USERS}${USER_ROUTE_PATHS.ME}`) {
      profileLoads += 1
      if (options.failProfile || (options.failProfileRefetch && profileLoads > 1)) return route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL", message: "Internal server error" } } })
      if (method === "PATCH") { const body = route.request().postData() ?? ""; const match = body.match(/name="displayName"\r?\n\r?\n([^\r\n]+)/); if (match) profile = { ...profile, displayName: match[1] } }
      return fulfill(route, profile)
    }
    if (path === `${API_ROUTES.USERS}${USER_ROUTE_PATHS.SEARCH}`) return fulfill(route, [FIXTURE_PEER])
    if (path.startsWith(`${API_ROUTES.USERS}/`)) return fulfill(route, FIXTURE_PEER)
    if (path === `${API_ROUTES.FRIENDS}${FRIEND_ROUTE_PATHS.RECEIVED_REQUESTS}` || path === `${API_ROUTES.FRIENDS}${FRIEND_ROUTE_PATHS.SENT_REQUESTS}`) return fulfill(route, [])
    if (path.endsWith("/conversation")) return fulfill(route, FIXTURE_CONVERSATIONS[0])
    if (path === API_ROUTES.FRIENDS) {
      if (options.failFriends) return route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL", message: "Internal server error" } } })
      return fulfill(route, [FIXTURE_PEER, ...["Albert Rodarte", "Allison Etter", "Craig Smiley", "Daniel Clay", "Iris Wells", "John Hall", "Mark Messer", "Ossie Wilson", "Steve Walker"].map((name, index) => ({ ...FIXTURE_PEER, id: String(index + 100).padStart(24, "0"), displayName: name }))])
    }
    if (path === API_ROUTES.CONVERSATIONS) {
      const rows = url.searchParams.get("kind") === "group" ? FIXTURE_CONVERSATIONS.filter((item) => item.type === CONVERSATION_TYPE.GROUP) : FIXTURE_CONVERSATIONS
      return fulfill(route, options.laterSelection && !url.searchParams.has("cursor") ? { items: rows.filter((item) => item.id !== FIXTURE_IDS.DIRECT), nextCursor: "second-page" } : { items: rows, nextCursor: null })
    }
    if (path.startsWith(`${API_ROUTES.CONVERSATIONS}/`)) { if (path.endsWith("/read")) readRequests.push(path); return fulfill(route, path.endsWith("/read") ? { conversationId: FIXTURE_IDS.DIRECT, lastReadMessageId: "000000000000000000000014", unreadCount: 0 } : []) }
    if (path === API_ROUTES.MESSAGES && method === "POST") {
      const body = route.request().postDataJSON() as { conversationId: string; content: string; clientMessageId: string }
      requests.push(body); attempts += 1
      if (options.failFirstSend && attempts === 1) return route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL", message: "Internal server error" } } })
      const message = { ...fixtureMessages(body.conversationId)[0], id: String(attempts + 200).padStart(24, "0"), senderId: FIXTURE_IDS.SELF, content: body.content, clientMessageId: body.clientMessageId, createdAt: "2026-10-24T03:10:00Z" }
      histories.set(body.conversationId, [...(histories.get(body.conversationId) ?? fixtureMessages(body.conversationId)), message])
      return fulfill(route, message)
    }
    if (path.startsWith(`${API_ROUTES.MESSAGES}/`)) {
      if (options.failOlderHistory && url.searchParams.has("cursor")) return route.fulfill({ status: 500, json: { success: false, error: { code: "INTERNAL", message: "Internal server error" } } })
      const id = path.split("/").at(-1) ?? FIXTURE_IDS.DIRECT
      return fulfill(route, { items: histories.get(id) ?? fixtureMessages(id), nextCursor: options.failOlderHistory ? "older" : null })
    }
    return route.fulfill({ status: 404, json: { success: false, error: { code: "NOT_FOUND", message: "Fixture endpoint missing" } } })
  })
  return { requests, readRequests }
}

import { INBOX_FIELDS, type InboxItemDto, type CursorPage } from "@linko/contracts"

/** Find only the requested accessible conversation, safely traversing stable cursor pages. */
export async function findSelectedConversation(id: string, load: (cursor?: string) => Promise<CursorPage<InboxItemDto>>): Promise<InboxItemDto | null> {
  const visited = new Set<string>()
  let cursor: string | undefined
  while (true) {
    const page = await load(cursor)
    const item = page.items.find((entry) => entry[INBOX_FIELDS.ID] === id)
    if (item) return item
    if (!page.nextCursor || visited.has(page.nextCursor)) return null
    visited.add(page.nextCursor)
    cursor = page.nextCursor
  }
}

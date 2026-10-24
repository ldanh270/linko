import { describe, expect, it } from "vitest"
import type { InboxItemDto } from "@linko/contracts"
import { mapConversationRow } from "./inbox.mapper"

describe("conversation rows", () => {
  it("should_use_group_initials_when_the_group_has_no_avatar", () => {
    const item = { id: "group", type: "GROUP", participants: [{ id: "peer", displayName: "Doris", avatarUrl: "/peer.jpg" }], group: { name: "General", avatarUrl: null }, lastMessage: null, unreadCount: 0 } as unknown as InboxItemDto
    expect(mapConversationRow(item, "me").avatarUrl).toBeNull()
  })
  it("should_use_the_other_participant_for_direct_chat_identity", () => {
    const item = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", type: "DIRECT", participants: [{ id: "me", displayName: "Myself", avatarUrl: null }, { id: "peer", displayName: "Nguyễn An", avatarUrl: "/an.jpg" }], group: null, lastMessage: null, unreadCount: 2, updatedAt: "2026-10-24T03:00:00Z" } as unknown as InboxItemDto
    expect(mapConversationRow(item, "me")).toMatchObject({ title: "Nguyễn An", avatarUrl: "/an.jpg", preview: "Chưa có tin nhắn", unreadCount: 2, href: "/direct/aaaaaaaaaaaaaaaaaaaaaaaa" })
  })
})

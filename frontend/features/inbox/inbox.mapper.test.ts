import { describe, expect, it } from "vitest"
import type { InboxItemDto } from "@linko/contracts"
import { mapConversationRow } from "./inbox.mapper"

describe("conversation rows", () => {
  it("should_use_group_initials_when_the_group_has_no_avatar", () => {
    const item = { id: "group", type: "GROUP", participants: [{ id: "peer", displayName: "Doris", avatarUrl: "/peer.jpg" }], group: { name: "General", avatarUrl: null }, lastMessage: null, unreadCount: 0 } as unknown as InboxItemDto
    const row = mapConversationRow(item, "me")
    expect(row.avatarUrl).toBeNull()
    expect(row.isGroup).toBe(true)
    expect(row.peerId).toBeNull()
  })

  it("should_use_the_other_participant_for_direct_chat_identity", () => {
    const item = { id: "aaaaaaaaaaaaaaaaaaaaaaaa", type: "DIRECT", participants: [{ id: "me", displayName: "Myself", avatarUrl: null }, { id: "peer", displayName: "Nguyễn An", avatarUrl: "/an.jpg" }], group: null, lastMessage: null, unreadCount: 2, updatedAt: "2026-10-24T03:00:00Z" } as unknown as InboxItemDto
    expect(mapConversationRow(item, "me")).toMatchObject({ title: "Nguyễn An", avatarUrl: "/an.jpg", preview: "Chưa có tin nhắn", unreadCount: 2, href: "/direct/aaaaaaaaaaaaaaaaaaaaaaaa", peerId: "peer", isGroup: false })
  })

  it("should_prefix_with_ban_when_the_last_message_was_sent_by_the_current_user", () => {
    const item = {
      id: "conv-1",
      type: "DIRECT",
      participants: [{ id: "me", displayName: "Duc An", avatarUrl: null }, { id: "peer", displayName: "Thành Đạt", avatarUrl: null }],
      group: null,
      lastMessage: {
        id: "msg-1",
        sender: { id: "me", displayName: "Duc An", avatarUrl: null },
        content: "ff",
        createdAt: "2026-10-25T10:20:00.000Z",
      },
      unreadCount: 0,
      updatedAt: "2026-10-25T10:20:00.000Z",
    } as unknown as InboxItemDto

    const row = mapConversationRow(item, "me")
    expect(row.preview).toBe("Bạn: ff")
  })

  it("should_show_sender_name_in_group_conversations", () => {
    const item = {
      id: "group-1",
      type: "GROUP",
      participants: [{ id: "me", displayName: "Duc An", avatarUrl: null }, { id: "other", displayName: "Đạt", avatarUrl: null }],
      group: { name: "Team Dev", avatarUrl: null },
      lastMessage: {
        id: "msg-2",
        sender: { id: "other", displayName: "Đạt", avatarUrl: null },
        content: "xin chao",
        createdAt: "2026-10-25T10:20:00.000Z",
      },
      unreadCount: 1,
      updatedAt: "2026-10-25T10:20:00.000Z",
    } as unknown as InboxItemDto

    const row = mapConversationRow(item, "me")
    expect(row.preview).toBe("Đạt: xin chao")
  })

  it("should_handle_attachment_only_previews_gracefully", () => {
    const ownItem = {
      id: "conv-own",
      type: "DIRECT",
      participants: [{ id: "me", displayName: "Duc An", avatarUrl: null }, { id: "peer", displayName: "Thành Đạt", avatarUrl: null }],
      group: null,
      lastMessage: {
        id: "msg-3",
        sender: { id: "me", displayName: "Duc An", avatarUrl: null },
        content: null,
        createdAt: "2026-10-25T10:20:00.000Z",
      },
      unreadCount: 0,
    } as unknown as InboxItemDto

    expect(mapConversationRow(ownItem, "me").preview).toBe("Bạn đã gửi một tệp đính kèm")

    const peerItem = {
      ...ownItem,
      lastMessage: { ...ownItem.lastMessage, sender: { id: "peer", displayName: "Thành Đạt", avatarUrl: null } },
    } as unknown as InboxItemDto

    expect(mapConversationRow(peerItem, "me").preview).toBe("Đã gửi một tệp đính kèm")
  })
})

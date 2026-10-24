import { describe, expect, it } from "vitest"
import type { MessageDto } from "@linko/contracts"
import { mapTimeline } from "./chat.mapper"

const message: MessageDto = { id: "m1", conversationId: "c1", senderId: "me", clientMessageId: "retry", content: null, replyTo: null, mentions: [], attachments: [{ id: "file", url: null, name: "photo.jpg", contentType: "image/jpeg", size: 1024 }], createdAt: "2026-10-24T03:00:00Z", updatedAt: "2026-10-24T03:00:00Z" }

describe("timeline mapping", () => {
  it("should_show_sender_identity_only_after_the_last_consecutive_message", () => {
    const rows = mapTimeline({ messages: [message, { ...message, id: "m2" }, { ...message, id: "m3", senderId: "other" }], currentUserId: "me", authors: [], pinnedIds: new Set() })
    expect(rows.map((row) => row.isGroupEnd)).toEqual([false, true, true])
  })
  it("should_align_messages_by_authenticated_sender_and_keep_attachment_only_messages", () => {
    const result = mapTimeline({ messages: [message, { ...message, id: "m2", senderId: "other", content: "Xin chào" }], currentUserId: "me", authors: [{ id: "me", name: "Tôi", avatarUrl: null }], pinnedIds: new Set() })
    expect(result[0]).toMatchObject({ isOwn: true, author: "Tôi", content: "", attachments: [{ id: "file" }] })
    expect(result[1]).toMatchObject({ isOwn: false, author: "Thành viên", content: "Xin chào" })
  })
  it("should_add_a_date_separator_only_when_the_calendar_day_changes", () => {
    const result = mapTimeline({ messages: [message, { ...message, id: "m2" }, { ...message, id: "m3", createdAt: "2026-10-25T03:00:00Z" }], currentUserId: "me", authors: [], pinnedIds: new Set() })
    expect(result.map((row) => row.showDate)).toEqual([false, false, true])
  })
})

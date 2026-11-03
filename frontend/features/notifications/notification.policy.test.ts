import { describe, expect, it } from "vitest"
import { evaluateMessageNotification, MessageNotificationDeduplicator } from "./notification.policy"
import type { MessageDto } from "@linko/contracts"

const message = { id: "one", senderId: "peer", conversationId: "chat" } as MessageDto
const input = { message, currentUserId: "me", visibleConversationId: null, isDocumentVisible: true, isMuted: false, permission: "granted" as NotificationPermission }

describe("message notification policy", () => {
  it("chooses toast or browser delivery from actual document visibility", () => {
    expect(evaluateMessageNotification(input)).toEqual({ showToast: true, showBrowserNotification: false, playSound: true })
    expect(evaluateMessageNotification({ ...input, isDocumentVisible: false, visibleConversationId: "chat" }))
      .toEqual({ showToast: false, showBrowserNotification: true, playSound: true })
    expect(evaluateMessageNotification({ ...input, visibleConversationId: "chat" }).showToast).toBe(false)
  })
  it("suppresses muted or own messages and never assumes permission", () => {
    for (const override of [{ isMuted: true }, { currentUserId: "peer" }, { currentUserId: undefined }]) {
      expect(evaluateMessageNotification({ ...input, ...override })).toEqual({ showToast: false, showBrowserNotification: false, playSound: false })
    }
    expect(evaluateMessageNotification({ ...input, isDocumentVisible: false, permission: "denied" }).showBrowserNotification).toBe(false)
  })
  it("deduplicates a bounded window without growing across a long session", () => {
    const dedup = new MessageNotificationDeduplicator()
    expect(dedup.accept("one")).toBe(true)
    expect(dedup.accept("one")).toBe(false)
    for (let index = 0; index < 500; index++) dedup.accept(String(index))
    expect(dedup.accept("one")).toBe(true)
    dedup.clear()
    expect(dedup.accept("one")).toBe(true)
  })
})

import { describe, expect, it, vi } from "vitest"
import { TypingService } from "./realtime.typing"

const conversationId = "507f1f77bcf86cd799439011"
const identity = { userId: "507f1f77bcf86cd799439012", socketId: "socket-1" }

describe("TypingService", () => {
    it("authorizes both start and stop and ignores malformed identifiers", async () => {
        const membership = { isCurrentMember: vi.fn().mockResolvedValue(false) }
        const service = new TypingService(membership)
        expect(await service.update({ ...identity, payload: { conversationId }, isTyping: true })).toBeNull()
        expect(await service.update({ ...identity, payload: { conversationId }, isTyping: false })).toBeNull()
        expect(await service.update({ ...identity, payload: { conversationId: "invalid" }, isTyping: true })).toBeNull()
        expect(membership.isCurrentMember).toHaveBeenCalledTimes(2)
    })

    it("throttles per connection without blocking stop or later bursts", async () => {
        let now = 1000
        const service = new TypingService({ isCurrentMember: async () => true }, () => now)
        const input = { ...identity, payload: { conversationId }, isTyping: true }
        expect(await service.update(input)).toMatchObject({ conversationId, userId: identity.userId, isTyping: true })
        now += 999
        expect(await service.update(input)).toBeNull()
        now += 1
        expect(await service.update(input)).not.toBeNull()
        expect(await service.update({ ...input, isTyping: false })).toMatchObject({ isTyping: false })
        expect(await service.update(input)).not.toBeNull()
        service.release(identity.socketId)
        expect(await service.update(input)).not.toBeNull()
    })
})

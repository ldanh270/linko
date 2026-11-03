import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryPresenceStore } from "./presence.memory"
import { PresenceService } from "./presence.service"

const userId = "507f1f77bcf86cd799439011"
const first = { userId, socketId: "first" }
const second = { userId, socketId: "second" }
afterEach(() => vi.useRealTimers())

describe("presence sessions", () => {
    it("renews active sockets and releases its timer on shutdown", async () => {
        vi.useFakeTimers()
        const service = new PresenceService({ fallback: new MemoryPresenceStore(), repository: { updateLastActive: vi.fn() }, onError: vi.fn(), onOffline: vi.fn() })
        await service.start()
        await service.connect(first)
        await vi.advanceTimersByTimeAsync(90000)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: true })
        await service.stop()
        expect(vi.getTimerCount()).toBe(0)
    })
    it("keeps a user online until the last distinct connection ends", async () => {
        const store = new MemoryPresenceStore()
        const service = new PresenceService({ fallback: store, repository: { updateLastActive: vi.fn() }, onError: vi.fn(), onOffline: vi.fn() })
        expect(await service.connect(first)).toBe(true)
        expect(await service.connect(first)).toBe(false)
        expect(await service.connect(second)).toBe(false)
        expect(await service.disconnect(first)).toBe(false)
        expect(await service.disconnect(first)).toBe(false)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: true })
        expect(await service.disconnect(second)).toBe(true)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: false })
    })

    it("expires abandoned leases without expiring a refreshed connection", async () => {
        const store = new MemoryPresenceStore()
        await store.connect(first, 0)
        await store.connect(second, 1000)
        await store.connect(second, 45000)
        expect(await store.cleanup(45001)).toEqual([])
        expect(await store.getPresenceBatch([userId])).toEqual({ [userId]: true })
        expect(await store.cleanup(90000)).toEqual([userId])
        expect(await store.getPresenceBatch([userId])).toEqual({ [userId]: false })
    })

    it("reconciles live connections and removed connections after Redis recovers", async () => {
        let ready = true
        const durable = new MemoryPresenceStore()
        const primary = {
            get isReady() { return ready }, initialize: async () => {}, close: async () => {},
            connect: durable.connect.bind(durable), disconnect: durable.disconnect.bind(durable),
            cleanup: durable.cleanup.bind(durable), getPresenceBatch: durable.getPresenceBatch.bind(durable),
        }
        const onError = vi.fn()
        const service = new PresenceService({ primary, fallback: new MemoryPresenceStore(), repository: { updateLastActive: vi.fn() }, onError, onOffline: vi.fn() })
        await service.connect(first)
        ready = false
        await service.disconnect(first)
        await service.connect({ ...second, userId: "507f1f77bcf86cd799439012" })
        ready = true
        expect(await service.getPresenceBatch([userId, "507f1f77bcf86cd799439012"])).toEqual({ [userId]: false, "507f1f77bcf86cd799439012": true })
    })

    it("logs a primary read failure and serves the active local registry", async () => {
        const onError = vi.fn()
        const primary = {
            isReady: true, initialize: async () => {}, close: async () => {},
            connect: async () => true, disconnect: async () => true, cleanup: async () => [],
            getPresenceBatch: vi.fn().mockRejectedValue(new Error("pipeline failure")),
        }
        const service = new PresenceService({ primary, fallback: new MemoryPresenceStore(), repository: { updateLastActive: vi.fn() }, onError, onOffline: vi.fn() })
        await service.connect(first)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: true })
        expect(onError).toHaveBeenCalledOnce()
    })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryPresenceStore } from "./presence.memory"
import { PresenceService } from "./presence.service"
import { BestEffortPresenceActivityRecorder } from "./presence.activity"

const userId = "507f1f77bcf86cd799439011"
const first = { userId, socketId: "first" }
const second = { userId, socketId: "second" }
afterEach(() => vi.useRealTimers())

describe("presence sessions", () => {
    it("reports the final disconnect even if last-active persistence fails", async () => {
        const onError = vi.fn()
        const activityRecorder = new BestEffortPresenceActivityRecorder({ updateLastActive: vi.fn().mockRejectedValue(new Error("DB unavailable")) }, onError)
        const service = new PresenceService({ fallback: new MemoryPresenceStore(), activityRecorder, onError, onOffline: vi.fn() })
        await service.connect(first)
        await expect(service.disconnect(first)).resolves.toBe(true)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: false })
        expect(onError).toHaveBeenCalledOnce()
    })

    it("delivers every expired-user event even if the first activity write fails", async () => {
        const onError = vi.fn(), onOffline = vi.fn()
        const activityRecorder = new BestEffortPresenceActivityRecorder({ updateLastActive: vi.fn().mockRejectedValueOnce(new Error("DB unavailable")).mockResolvedValue(undefined) }, onError)
        const primary = { isReady: true, generation: 1, initialize: async () => {}, close: async () => {}, connect: async () => false, disconnect: async () => false,
            cleanup: vi.fn().mockResolvedValueOnce([userId, "other-user"]).mockResolvedValue([]), getPresenceBatch: async () => ({}) }
        const service = new PresenceService({ primary, fallback: new MemoryPresenceStore(), activityRecorder, onError, onOffline })
        await service.start()
        await service.stop()
        expect(onOffline.mock.calls).toEqual([[userId], ["other-user"]])
        expect(onError).toHaveBeenCalledOnce()
    })

    it("reconciles a fast remote restart even if no call observed the outage", async () => {
        let remote = new MemoryPresenceStore()
        let generation = 1
        const primary = { isReady: true, get generation() { return generation }, initialize: async () => {}, close: async () => {},
            connect: (connection: typeof first, now: number) => remote.connect(connection, now),
            disconnect: (connection: typeof first) => remote.disconnect(connection), cleanup: (now: number) => remote.cleanup(now),
            getPresenceBatch: (ids: readonly string[]) => remote.getPresenceBatch(ids) }
        const service = new PresenceService({ primary, fallback: new MemoryPresenceStore(), activityRecorder: { recordOffline: vi.fn() }, onError: vi.fn(), onOffline: vi.fn() })
        await service.connect(first)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: true })
        remote = new MemoryPresenceStore()
        generation += 1
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: true })
    })
    it("renews active sockets and releases its timer on shutdown", async () => {
        vi.useFakeTimers()
        const service = new PresenceService({ fallback: new MemoryPresenceStore(), activityRecorder: { recordOffline: vi.fn() }, onError: vi.fn(), onOffline: vi.fn() })
        await service.start()
        await service.connect(first)
        await vi.advanceTimersByTimeAsync(90000)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: true })
        await service.stop()
        expect(vi.getTimerCount()).toBe(0)
    })
    it("keeps a user online until the last distinct connection ends", async () => {
        const store = new MemoryPresenceStore()
        const service = new PresenceService({ fallback: store, activityRecorder: { recordOffline: vi.fn() }, onError: vi.fn(), onOffline: vi.fn() })
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
            get isReady() { return ready }, generation: 1, initialize: async () => {}, close: async () => {},
            connect: durable.connect.bind(durable), disconnect: durable.disconnect.bind(durable),
            cleanup: durable.cleanup.bind(durable), getPresenceBatch: durable.getPresenceBatch.bind(durable),
        }
        const onError = vi.fn()
        const service = new PresenceService({ primary, fallback: new MemoryPresenceStore(), activityRecorder: { recordOffline: vi.fn() }, onError, onOffline: vi.fn() })
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
            isReady: true, generation: 1, initialize: async () => {}, close: async () => {},
            connect: async () => true, disconnect: async () => true, cleanup: async () => [],
            getPresenceBatch: vi.fn().mockRejectedValue(new Error("pipeline failure")),
        }
        const service = new PresenceService({ primary, fallback: new MemoryPresenceStore(), activityRecorder: { recordOffline: vi.fn() }, onError, onOffline: vi.fn() })
        await service.connect(first)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: true })
        expect(onError).toHaveBeenCalledOnce()
    })
})

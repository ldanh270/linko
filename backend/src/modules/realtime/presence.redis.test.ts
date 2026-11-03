import { randomUUID } from "node:crypto"
import Redis from "ioredis"
import { afterEach, describe, expect, it } from "vitest"
import { BitmapPresenceStore } from "./presence.bitmap"
import { RedisPresenceSessions } from "./presence.sessions"
import { PresenceService } from "./presence.service"
import { MemoryPresenceStore } from "./presence.memory"

const url = process.env.REDIS_TEST_URL
const userId = "507f1f77bcf86cd799439011"
const clients: Redis[] = []
const prefixes: string[] = []

afterEach(async () => {
    for (const prefix of prefixes.splice(0)) {
        const keys = await clients[0].keys(`${prefix}*`)
        if (keys.length) await clients[0].del(...keys)
    }
    await Promise.all(clients.splice(0).map((client) => client.quit()))
})

/** Tests opt into an isolated Redis endpoint and delete only their random namespace. */
describe.skipIf(!url)("Redis presence integration", () => {
    it("allocates one offset across concurrent clients and never allocates on reads", async () => {
        const { redis, bitmap, prefix } = await fixture()
        const other = new Redis(url ?? "", { lazyConnect: true })
        clients.push(other)
        await other.connect()
        const second = new BitmapPresenceStore(other, prefix)
        expect(await bitmap.isOnline(userId)).toBe(false)
        expect(await redis.hlen(bitmap.keys.offsets)).toBe(0)
        const offsets = await Promise.all(Array.from({ length: 30 }, (_, index) => (index % 2 ? bitmap : second).getOffset(userId)))
        expect(new Set(offsets).size).toBe(1)
        expect(await redis.get(bitmap.keys.counter)).toBe("1")
        await bitmap.setOnline(userId)
        expect(await bitmap.getPresenceBatch([userId, "unknown"])).toEqual({ [userId]: true, unknown: false })
        expect(await bitmap.getOnlineCount()).toBe(1)
        await bitmap.setOffline(userId)
        expect(await bitmap.getOnlineCount()).toBe(0)
    })

    it("keeps other sockets online, expires crashed leases and prunes after restart", async () => {
        const { redis, bitmap } = await fixture()
        const sessions = new RedisPresenceSessions(redis, bitmap)
        const first = { userId, socketId: "first" }
        const second = { userId, socketId: "second" }
        expect(await sessions.connect(first, 0)).toBe(true)
        expect(await sessions.connect(second, 0)).toBe(false)
        expect(await sessions.disconnect(first, 1)).toBe(false)
        expect(await bitmap.isOnline(userId)).toBe(true)
        const restarted = new RedisPresenceSessions(redis, bitmap)
        expect(await restarted.cleanup(45000)).toEqual([userId])
        expect(await bitmap.isOnline(userId)).toBe(false)
        expect(await restarted.disconnect(second, 45001)).toBe(false)
        expect(await redis.zcard(bitmap.keys.deadlines)).toBe(0)
    })

    it("keeps a renewed connection online after another lease expires", async () => {
        const { redis, bitmap } = await fixture()
        const sessions = new RedisPresenceSessions(redis, bitmap)
        await sessions.connect({ userId, socketId: "first" }, 0)
        await sessions.connect({ userId, socketId: "second" }, 1000)
        await sessions.connect({ userId, socketId: "second" }, 44000)
        expect(await sessions.cleanup(45000)).toEqual([])
        expect(await bitmap.isOnline(userId)).toBe(true)
        expect(await sessions.cleanup(89000)).toEqual([userId])
    })

    it("rebuilds Redis from live sockets and departed sockets after an actual reconnect", async () => {
        const { redis, bitmap } = await fixture()
        const service = new PresenceService({
            primary: new RedisPresenceSessions(redis, bitmap), fallback: new MemoryPresenceStore(),
            activityRecorder: { recordOffline: async () => {} }, onError: (error) => { throw error }, onOffline: () => {},
        })
        const first = { userId, socketId: "first" }
        const otherId = "507f1f77bcf86cd799439012"
        await service.connect(first)
        await new Promise<void>((resolve) => { redis.once("end", () => resolve()); redis.disconnect() })
        await service.disconnect(first)
        await service.connect({ userId: otherId, socketId: "other" })
        expect(await service.getPresenceBatch([userId, otherId])).toEqual({ [userId]: false, [otherId]: true })
        await redis.connect()
        expect(await service.getPresenceBatch([userId, otherId])).toEqual({ [userId]: false, [otherId]: true })
        expect(await bitmap.isOnline(userId)).toBe(false)
        expect(await bitmap.isOnline(otherId)).toBe(true)
    })

    it("reconciles lost keys after a reconnect that occurs between service calls", async () => {
        const { redis, bitmap, prefix } = await fixture()
        const primary = new RedisPresenceSessions(redis, bitmap)
        const service = new PresenceService({ primary, fallback: new MemoryPresenceStore(),
            activityRecorder: { recordOffline: async () => {} }, onError: (error) => { throw error }, onOffline: () => {} })
        await service.connect({ userId, socketId: "live-socket" })
        const generation = primary.generation
        const keys = await redis.keys(`${prefix}*`)
        await redis.del(...keys)
        await new Promise<void>((resolve) => { redis.once("end", () => resolve()); redis.disconnect() })
        await redis.connect()
        expect(primary.generation).toBeGreaterThan(generation)
        expect(await service.getPresenceBatch([userId])).toEqual({ [userId]: true })
        expect(await bitmap.isOnline(userId)).toBe(true)
    })
})

async function fixture() {
    const prefix = `linko:test:presence:${randomUUID()}:`
    prefixes.push(prefix)
    const redis = new Redis(url ?? "", { lazyConnect: true, maxRetriesPerRequest: 1 })
    clients.push(redis)
    await redis.connect()
    return { redis, prefix, bitmap: new BitmapPresenceStore(redis, prefix) }
}

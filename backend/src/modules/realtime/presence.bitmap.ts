import type Redis from "ioredis"
import { PRESENCE_KEYS, PRESENCE_MESSAGES } from "./presence.constants"
import { ALLOCATE_PRESENCE_OFFSET } from "./presence.scripts"
import type { PresenceReader } from "./presence.types"

/** Store compact Redis bitmap flags independently of connection lifecycle.
 * @pattern Adapter
 * @layer Repository
 */
export class BitmapPresenceStore implements PresenceReader {
    /** Keys are exposed to the session adapter so both mutate the same bitmap atomically. */
    readonly keys: { readonly bitmap: string; readonly offsets: string; readonly counter: string; readonly deadlines: string; readonly sessions: string }

    /** Inject an already-owned Redis connection; tests use an isolated namespace. */
    constructor(private readonly redis: Redis, prefix: string = PRESENCE_KEYS.PREFIX) {
        this.keys = {
            bitmap: `${prefix}${PRESENCE_KEYS.BITMAP}`, offsets: `${prefix}${PRESENCE_KEYS.OFFSETS}`,
            counter: `${prefix}${PRESENCE_KEYS.COUNTER}`, deadlines: `${prefix}${PRESENCE_KEYS.DEADLINES}`,
            sessions: `${prefix}${PRESENCE_KEYS.SESSIONS}`,
        }
    }

    /** Allocate only on writes, keeping concurrent writers on one stable offset. */
    async getOffset(userId: string): Promise<number> {
        return Number(await this.redis.eval(ALLOCATE_PRESENCE_OFFSET, 2, this.keys.offsets, this.keys.counter, userId))
    }

    /** Set the user's bit without changing its public ObjectId identity. */
    async setOnline(userId: string): Promise<void> {
        await this.redis.setbit(this.keys.bitmap, await this.getOffset(userId), 1)
    }

    /** Clear existing flags without allocating offsets for unknown users. */
    async setOffline(userId: string): Promise<void> {
        const offset = await this.redis.hget(this.keys.offsets, userId)
        if (offset !== null) await this.redis.setbit(this.keys.bitmap, Number(offset), 0)
    }

    /** Read one account without modifying the mapping. */
    async isOnline(userId: string): Promise<boolean> {
        return (await this.getPresenceBatch([userId]))[userId] ?? false
    }

    /** Batch mapping lookup and pipeline only existing offsets; command errors propagate. */
    async getPresenceBatch(userIds: readonly string[]): Promise<Record<string, boolean>> {
        const ids = [...new Set(userIds)]
        const result: Record<string, boolean> = Object.fromEntries(ids.map((id) => [id, false]))
        if (!ids.length) return result
        const offsets = await this.redis.hmget(this.keys.offsets, ...ids)
        const known = ids.flatMap((id, index) => offsets[index] === null ? [] : [{ id, offset: Number(offsets[index]) }])
        if (!known.length) return result
        const pipeline = this.redis.pipeline()
        for (const { offset } of known) pipeline.getbit(this.keys.bitmap, offset)
        const replies = await pipeline.exec()
        if (!replies || replies.length !== known.length) throw new Error(PRESENCE_MESSAGES.PIPELINE_FAILED)
        replies.forEach(([error, bit], index) => {
            if (error) throw error
            result[known[index].id] = bit === 1
        })
        return result
    }

    /** Count online flags without loading the entire bitmap into application memory. */
    getOnlineCount(): Promise<number> { return this.redis.bitcount(this.keys.bitmap) }
}

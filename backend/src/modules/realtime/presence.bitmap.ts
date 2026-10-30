import type Redis from "ioredis"

const PRESENCE_BITMAP_KEY = "presence:bitmap"
const PRESENCE_OFFSETS_HASH = "presence:user_offsets"
const PRESENCE_COUNTER_KEY = "presence:user_offsets:counter"

/**
 * High-performance presence store using Redis Bitmaps (SETBIT/GETBIT/BITCOUNT),
 * with an automatic, zero-overhead In-Memory bit vector fallback.
 *
 * Each user is represented by exactly 1 bit (0 = offline, 1 = online).
 * 1 million users require only ~128 KB of memory.
 *
 * @pattern Strategy
 */
export class BitmapPresenceStore {
    private inMemoryBuffer = new Uint8Array(131072) // 128KB in-memory bit vector
    private inMemoryOffsets = new Map<string, number>()
    private nextOffset = 0
    private isRedisConnected = false

    constructor(private readonly redis: Redis | null = null) {
        if (this.redis) {
            void this.redis.connect().then(() => {
                this.isRedisConnected = true
            }).catch(() => {
                this.isRedisConnected = false
            })
        }
    }

    /** Resolve or assign an integer bit offset for a MongoDB ObjectId string. */
    async getOffset(userId: string): Promise<number> {
        if (this.isRedisConnected && this.redis) {
            try {
                const existing = await this.redis.hget(PRESENCE_OFFSETS_HASH, userId)
                if (existing !== null) return parseInt(existing, 10)

                const next = await this.redis.incr(PRESENCE_COUNTER_KEY)
                await this.redis.hset(PRESENCE_OFFSETS_HASH, userId, next.toString())
                return next
            } catch {
                // Fall back to in-memory if Redis command fails
            }
        }

        let offset = this.inMemoryOffsets.get(userId)
        if (offset === undefined) {
            offset = ++this.nextOffset
            this.inMemoryOffsets.set(userId, offset)
        }
        return offset
    }

    /** Set bit to 1 for this user (online). */
    async setOnline(userId: string): Promise<void> {
        const offset = await this.getOffset(userId)
        if (this.isRedisConnected && this.redis) {
            try {
                await this.redis.setbit(PRESENCE_BITMAP_KEY, offset, 1)
                return
            } catch {
                // Fallback to in-memory
            }
        }
        this.setInMemoryBit(offset, 1)
    }

    /** Set bit to 0 for this user (offline). */
    async setOffline(userId: string): Promise<void> {
        const offset = await this.getOffset(userId)
        if (this.isRedisConnected && this.redis) {
            try {
                await this.redis.setbit(PRESENCE_BITMAP_KEY, offset, 0)
                return
            } catch {
                // Fallback to in-memory
            }
        }
        this.setInMemoryBit(offset, 0)
    }

    /** Check if a single user is online (bit === 1). */
    async isOnline(userId: string): Promise<boolean> {
        const offset = await this.getOffset(userId)
        if (this.isRedisConnected && this.redis) {
            try {
                const bit = await this.redis.getbit(PRESENCE_BITMAP_KEY, offset)
                return bit === 1
            } catch {
                // Fallback to in-memory
            }
        }
        return this.getInMemoryBit(offset) === 1
    }

    /** Query batch presence statuses efficiently via Redis pipeline or in-memory lookup. */
    async getPresenceBatch(userIds: readonly string[]): Promise<Record<string, boolean>> {
        const result: Record<string, boolean> = {}
        if (!userIds.length) return result

        const offsets = await Promise.all(userIds.map((id) => this.getOffset(id)))

        if (this.isRedisConnected && this.redis) {
            try {
                const pipeline = this.redis.pipeline()
                for (const offset of offsets) {
                    pipeline.getbit(PRESENCE_BITMAP_KEY, offset)
                }
                const execResults = await pipeline.exec()
                if (execResults) {
                    for (let i = 0; i < userIds.length; i++) {
                        const [err, val] = execResults[i]
                        result[userIds[i]] = !err && val === 1
                    }
                    return result
                }
            } catch {
                // Fallback to in-memory
            }
        }

        for (let i = 0; i < userIds.length; i++) {
            result[userIds[i]] = this.getInMemoryBit(offsets[i]) === 1
        }
        return result
    }

    /** Total count of currently online users (BITCOUNT). */
    async getOnlineCount(): Promise<number> {
        if (this.isRedisConnected && this.redis) {
            try {
                return await this.redis.bitcount(PRESENCE_BITMAP_KEY)
            } catch {
                // Fallback
            }
        }
        let count = 0
        for (let i = 0; i < this.inMemoryBuffer.length; i++) {
            const byte = this.inMemoryBuffer[i]
            if (byte > 0) {
                let b = byte
                while (b > 0) {
                    b &= b - 1
                    count++
                }
            }
        }
        return count
    }

    private setInMemoryBit(offset: number, value: 0 | 1): void {
        const byteIndex = Math.floor(offset / 8)
        const bitIndex = 7 - (offset % 8) // Redis big-endian bit numbering standard

        if (byteIndex >= this.inMemoryBuffer.length) {
            const newBuffer = new Uint8Array(Math.max(this.inMemoryBuffer.length * 2, byteIndex + 1024))
            newBuffer.set(this.inMemoryBuffer)
            this.inMemoryBuffer = newBuffer
        }

        if (value === 1) {
            this.inMemoryBuffer[byteIndex] |= (1 << bitIndex)
        } else {
            this.inMemoryBuffer[byteIndex] &= ~(1 << bitIndex)
        }
    }

    private getInMemoryBit(offset: number): 0 | 1 {
        const byteIndex = Math.floor(offset / 8)
        const bitIndex = 7 - (offset % 8)

        if (byteIndex >= this.inMemoryBuffer.length) return 0
        return ((this.inMemoryBuffer[byteIndex] & (1 << bitIndex)) !== 0) ? 1 : 0
    }
}

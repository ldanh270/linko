import Redis from "ioredis"

/** Redis connection options for presence bitmap tracking. */
export const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING

/** Create a Redis client instance with fail-safe reconnect policies. */
export function createRedisClient(): Redis | null {
    if (!REDIS_URL) return null

    try {
        const client = new Redis(REDIS_URL, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            retryStrategy(times) {
                if (times > 3) return null
                return Math.min(times * 100, 1000)
            },
        })

        client.on("error", (err) => {
            // Log quietly without crashing server
            console.warn("[Redis] Connection warning:", err.message)
        })

        return client
    } catch {
        return null
    }
}

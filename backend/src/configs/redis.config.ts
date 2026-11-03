import Redis from "ioredis"

/** Resolve Redis configuration without logging credentials or connection URLs. */
export const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING

/** Create a lazy client; lifecycle initialization and error recording belong to its owner. */
export function createRedisClient(onError: (error: unknown) => void): Redis | null {
    if (!REDIS_URL) return null
    const client = new Redis(REDIS_URL, {
        lazyConnect: true, connectTimeout: 3000, maxRetriesPerRequest: 1, enableOfflineQueue: false,
        retryStrategy: (attempt) => Math.min(attempt * 250, 5000),
    })
    client.on("error", onError)
    return client
}

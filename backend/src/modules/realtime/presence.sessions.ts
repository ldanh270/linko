import type Redis from "ioredis"
import { BitmapPresenceStore } from "./presence.bitmap"
import { PRESENCE_TIMING } from "./presence.constants"
import { UPDATE_PRESENCE_SESSION } from "./presence.scripts"
import type { PresenceConnection, RemotePresenceStore } from "./presence.types"

const SESSION_OPERATIONS = { CONNECT: "connect", DISCONNECT: "disconnect", PRUNE: "prune" } as const

/** Persist per-socket leases and bitmap transitions in a single Redis operation.
 * @pattern Adapter
 * @layer Repository
 */
export class RedisPresenceSessions implements RemotePresenceStore {
    /** Inject bitmap mapping and connection ownership from the composition root. */
    constructor(private readonly redis: Redis, private readonly bitmap: BitmapPresenceStore) {}

    /** Report transport readiness so orchestration can reconcile before reading. */
    get isReady(): boolean { return this.redis.status === "ready" }

    /** Establish the configured lazy connection once. */
    async initialize(): Promise<void> {
        if (this.isReady) return
        if (this.redis.status === "wait" || this.redis.status === "end") await this.redis.connect()
    }

    /** Release Redis resources without leaving reconnect timers alive. */
    async close(): Promise<void> { this.redis.disconnect() }

    /** Renew a socket lease and return whether the user became online. */
    async connect(connection: PresenceConnection, now: number): Promise<boolean> {
        return (await this.update(connection, now, SESSION_OPERATIONS.CONNECT)) === 1
    }

    /** Remove a socket without affecting other unexpired sessions. */
    async disconnect(connection: PresenceConnection, now: number): Promise<boolean> {
        return (await this.update(connection, now, SESSION_OPERATIONS.DISCONNECT)) === -1
    }

    /** Prune expired user deadlines in batches, including abandoned sessions after restart. */
    async cleanup(now: number): Promise<readonly string[]> {
        const offline: string[] = []
        let due: string[]
        do {
            due = await this.redis.zrangebyscore(this.bitmap.keys.deadlines, "-inf", now, "LIMIT", 0, PRESENCE_TIMING.CLEANUP_BATCH)
            for (const userId of due) {
                if (await this.update({ userId, socketId: "" }, now, SESSION_OPERATIONS.PRUNE) === -1) offline.push(userId)
            }
        } while (due.length === PRESENCE_TIMING.CLEANUP_BATCH)
        return offline
    }

    /** Read the bitmap through the shared mapping adapter. */
    getPresenceBatch(userIds: readonly string[]): Promise<Record<string, boolean>> {
        return this.bitmap.getPresenceBatch(userIds)
    }

    private async update(connection: PresenceConnection, now: number, operation: string): Promise<number> {
        const keys = this.bitmap.keys
        return Number(await this.redis.eval(UPDATE_PRESENCE_SESSION, 5,
            keys.offsets, keys.counter, keys.bitmap, `${keys.sessions}${connection.userId}`, keys.deadlines,
            connection.userId, connection.socketId, operation, now, now + PRESENCE_TIMING.LEASE_MS))
    }
}

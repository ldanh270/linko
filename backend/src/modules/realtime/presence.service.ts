import { PRESENCE_MESSAGES, PRESENCE_TIMING } from "./presence.constants"
import type { PresenceConnection, PresenceDependencies, PresenceLifecycle, RemotePresenceStore } from "./presence.types"

/** Coordinate leases and recovery independently of Redis and Mongoose.
 * @layer Service
 */
export class PresenceService implements PresenceLifecycle {
    private readonly active = new Map<string, PresenceConnection>()
    private readonly departed = new Map<string, PresenceConnection>()
    private pending: Promise<unknown> = Promise.resolve()
    private synchronizedGeneration: number | null = null
    private timer: ReturnType<typeof setInterval> | null = null

    /** Inject storage, fallback and infrastructure failure reporting. */
    constructor(private readonly dependencies: PresenceDependencies) {}

    /** Initialize storage and start bounded lease renewal before traffic. */
    async start(): Promise<void> {
        if (this.timer) return
        try { await this.dependencies.primary?.initialize() }
        catch (error) { this.dependencies.onError(error) }
        await this.enqueue(() => this.maintain())
        this.timer = setInterval(() => { void this.enqueue(() => this.maintain()).catch(this.dependencies.onError) }, PRESENCE_TIMING.HEARTBEAT_MS)
        this.timer.unref()
    }

    /** Stop renewal and close owned resources after pending operations settle. */
    async stop(): Promise<void> {
        if (this.timer) clearInterval(this.timer)
        this.timer = null
        await this.pending
        await this.dependencies.primary?.close()
    }

    /** Register a socket idempotently, serializing reads and lifecycle transitions. */
    connect(connection: PresenceConnection): Promise<boolean> {
        return this.enqueue(async () => {
            this.active.set(connection.socketId, connection)
            this.departed.delete(connection.socketId)
            const changed = await this.dependencies.fallback.connect(connection, this.now())
            await this.remote((store) => store.connect(connection, this.now()))
            return changed
        })
    }

    /** Remove exactly one socket and persist lastActive after its final local connection. */
    disconnect(connection: PresenceConnection): Promise<boolean> {
        return this.enqueue(async () => {
            if (!this.active.delete(connection.socketId)) return false
            if (this.dependencies.primary) this.departed.set(connection.socketId, connection)
            const changed = await this.dependencies.fallback.disconnect(connection, this.now())
            await this.remote((store) => store.disconnect(connection, this.now()))
            if (changed) await this.dependencies.activityRecorder.recordOffline(connection.userId, new Date(this.now()))
            return changed
        })
    }

    /** Prefer reconciled Redis; failures are logged before using the local mirror. */
    getPresenceBatch(userIds: readonly string[]): Promise<Record<string, boolean>> {
        return this.enqueue(async () => await this.remote((store) => store.getPresenceBatch(userIds))
            ?? this.dependencies.fallback.getPresenceBatch(userIds))
    }

    private now(): number { return this.dependencies.now?.() ?? Date.now() }

    private enqueue<T>(operation: () => Promise<T>): Promise<T> {
        const next = this.pending.then(operation)
        this.pending = next.catch(() => {})
        return next
    }

    private async remote<T>(operation: (store: RemotePresenceStore) => Promise<T>): Promise<T | undefined> {
        const primary = this.dependencies.primary
        if (!primary?.isReady) { this.synchronizedGeneration = null; return undefined }
        const generation = primary.generation
        try {
            if (this.synchronizedGeneration !== generation) await this.reconcile(primary, generation)
            const result = await operation(primary)
            if (primary.generation !== generation) throw new Error(PRESENCE_MESSAGES.REDIS_UNAVAILABLE)
            this.departed.clear()
            return result
        } catch (error) {
            this.synchronizedGeneration = null
            this.dependencies.onError(error)
            return undefined
        }
    }

    private async reconcile(primary: RemotePresenceStore, generation: number): Promise<void> {
        for (const connection of this.departed.values()) await primary.disconnect(connection, this.now())
        for (const connection of this.active.values()) await primary.connect(connection, this.now())
        await this.publishExpired(await primary.cleanup(this.now()))
        this.synchronizedGeneration = generation
    }

    private async maintain(): Promise<void> {
        for (const connection of this.active.values()) await this.dependencies.fallback.connect(connection, this.now())
        await this.remote(async (store) => {
            for (const connection of this.active.values()) await store.connect(connection, this.now())
            await this.publishExpired(await store.cleanup(this.now()))
        })
    }

    private async publishExpired(userIds: readonly string[]): Promise<void> {
        for (const userId of userIds) {
            await this.dependencies.activityRecorder.recordOffline(userId, new Date(this.now()))
            this.dependencies.onOffline(userId)
        }
    }
}

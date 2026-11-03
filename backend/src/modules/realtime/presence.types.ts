/** Authenticated socket identity for idempotent connection tracking. */
export interface PresenceConnection { readonly userId: string; readonly socketId: string }

/** Read-only online snapshot shared by HTTP and realtime boundaries. */
export interface PresenceReader {
    /** Return flags without allocating offsets for unknown users. */
    getPresenceBatch(userIds: readonly string[]): Promise<Record<string, boolean>>
}

/** Session persistence keeps leases and bitmap transitions consistent. */
export interface PresenceStore extends PresenceReader {
    /** Renew a socket and report an offline-to-online transition. */
    connect(connection: PresenceConnection, now: number): Promise<boolean>
    /** Remove a socket and report an online-to-offline transition. */
    disconnect(connection: PresenceConnection, now: number): Promise<boolean>
    /** Expire abandoned leases and return newly offline users. */
    cleanup(now: number): Promise<readonly string[]>
}

/** Remote storage exposes readiness without hidden connection attempts. */
export interface RemotePresenceStore extends PresenceStore {
    readonly isReady: boolean
    /** Monotonic connection epoch changes even if an outage happens between lifecycle calls. */
    readonly generation: number
    /** Open the injected remote connection before accepting traffic. */
    initialize(): Promise<void>
    /** Close the owned connection during shutdown. */
    close(): Promise<void>
}

/** Persistence boundary for last-active timestamps. */
export interface PresenceRepository {
    /** Persist final connection time through the system audit aspect. */
    updateLastActive(userId: string, at: Date): Promise<void>
}

/** Observational persistence cannot reject already-completed presence transitions. */
export interface PresenceActivityRecorder {
    /** Record last-active state; infrastructure failures are reported by the injected aspect. */
    recordOffline(userId: string, at: Date): Promise<void>
}

/** Lifecycle port shared by the gateway and composition root. */
export interface PresenceLifecycle extends PresenceReader {
    /** Register an authenticated socket idempotently. */
    connect(connection: PresenceConnection): Promise<boolean>
    /** Remove one socket while leaving other tabs online. */
    disconnect(connection: PresenceConnection): Promise<boolean>
    /** Initialize persistence and start lease maintenance. */
    start(): Promise<void>
    /** Release maintenance and remote resources. */
    stop(): Promise<void>
}

/** Explicit collaborators keep orchestration independent of Redis and MongoDB. */
export interface PresenceDependencies {
    readonly primary?: RemotePresenceStore | null
    readonly fallback: PresenceStore
    readonly activityRecorder: PresenceActivityRecorder
    readonly onError: (error: unknown) => void
    readonly onOffline: (userId: string) => void
    readonly now?: () => number
}

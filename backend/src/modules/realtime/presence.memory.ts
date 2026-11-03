import { PRESENCE_TIMING } from "./presence.constants"
import type { PresenceConnection, PresenceStore } from "./presence.types"

/** Maintain process-local leases while Redis is unavailable.
 * @pattern Adapter
 * @layer Repository
 */
export class MemoryPresenceStore implements PresenceStore {
    private readonly users = new Map<string, Map<string, number>>()

    /** Renew a connection without duplicating an existing socket. */
    async connect({ userId, socketId }: PresenceConnection, now: number): Promise<boolean> {
        const sessions = this.users.get(userId) ?? new Map<string, number>()
        const wasOffline = sessions.size === 0
        sessions.set(socketId, now + PRESENCE_TIMING.LEASE_MS)
        this.users.set(userId, sessions)
        return wasOffline
    }

    /** Remove one socket; repeated disconnects cannot remove another tab. */
    async disconnect({ userId, socketId }: PresenceConnection): Promise<boolean> {
        const sessions = this.users.get(userId)
        if (!sessions?.delete(socketId) || sessions.size > 0) return false
        this.users.delete(userId)
        return true
    }

    /** Expire abandoned sessions and report only final-connection transitions. */
    async cleanup(now: number): Promise<readonly string[]> {
        const offline: string[] = []
        for (const [userId, sessions] of this.users) {
            for (const [socketId, expiry] of sessions) if (expiry <= now) sessions.delete(socketId)
            if (sessions.size === 0) { this.users.delete(userId); offline.push(userId) }
        }
        return offline
    }

    /** Read flags without creating user/session entries. */
    async getPresenceBatch(userIds: readonly string[]): Promise<Record<string, boolean>> {
        return Object.fromEntries(userIds.map((userId) => [userId, this.users.has(userId)]))
    }
}

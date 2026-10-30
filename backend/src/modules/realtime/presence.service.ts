import mongoose from "mongoose"
import User from "../../models/User"
import { BitmapPresenceStore } from "./presence.bitmap"
import { createRedisClient } from "../../configs/redis.config"

/**
 * Coordinate user online/offline lifecycle and multi-connection presence.
 *
 * @layer Service
 */
export class PresenceService {
    private readonly store: BitmapPresenceStore
    private readonly socketCounts = new Map<string, number>()

    constructor(store?: BitmapPresenceStore) {
        this.store = store ?? new BitmapPresenceStore(createRedisClient())
    }

    /** Handle a new socket connection for this user. */
    async onConnect(userId: string): Promise<boolean> {
        const count = (this.socketCounts.get(userId) ?? 0) + 1
        this.socketCounts.set(userId, count)

        if (count === 1) {
            await this.store.setOnline(userId)
            return true // Transitioned from offline to online
        }
        return false
    }

    /** Handle a socket disconnection for this user. */
    async onDisconnect(userId: string): Promise<boolean> {
        const current = this.socketCounts.get(userId) ?? 1
        const count = Math.max(0, current - 1)

        if (count === 0) {
            this.socketCounts.delete(userId)
            await this.store.setOffline(userId)
            if (mongoose.connection.readyState === 1) {
                void User.findByIdAndUpdate(userId, { lastActive: new Date() }).catch(() => {})
            }
            return true // Transitioned from online to offline
        }

        this.socketCounts.set(userId, count)
        return false
    }

    /** Query batch presence states for an array of user IDs. */
    async getPresenceBatch(userIds: readonly string[]): Promise<Record<string, boolean>> {
        return this.store.getPresenceBatch(userIds)
    }

    /** Check if a single user is currently online. */
    async isOnline(userId: string): Promise<boolean> {
        return this.store.isOnline(userId)
    }

    /** Get total number of online users. */
    async getOnlineCount(): Promise<number> {
        return this.store.getOnlineCount()
    }
}

export const presenceService = new PresenceService()

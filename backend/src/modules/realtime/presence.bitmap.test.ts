import { describe, expect, it } from "vitest"
import { BitmapPresenceStore } from "./presence.bitmap"
import { PresenceService } from "./presence.service"

describe("BitmapPresenceStore", () => {
    it("should_track_online_and_offline_status_using_exact_bitmap_bits", async () => {
        const store = new BitmapPresenceStore()
        const userA = "507f1f77bcf86cd799439011"
        const userB = "507f1f77bcf86cd799439012"

        expect(await store.isOnline(userA)).toBe(false)
        expect(await store.isOnline(userB)).toBe(false)

        await store.setOnline(userA)
        expect(await store.isOnline(userA)).toBe(true)
        expect(await store.isOnline(userB)).toBe(false)
        expect(await store.getOnlineCount()).toBe(1)

        await store.setOnline(userB)
        expect(await store.isOnline(userA)).toBe(true)
        expect(await store.isOnline(userB)).toBe(true)
        expect(await store.getOnlineCount()).toBe(2)

        const batch = await store.getPresenceBatch([userA, userB, "507f1f77bcf86cd799439013"])
        expect(batch).toEqual({
            [userA]: true,
            [userB]: true,
            "507f1f77bcf86cd799439013": false,
        })

        await store.setOffline(userA)
        expect(await store.isOnline(userA)).toBe(false)
        expect(await store.isOnline(userB)).toBe(true)
        expect(await store.getOnlineCount()).toBe(1)
    })
})

describe("PresenceService", () => {
    it("should_handle_multi_tab_connections_before_transitioning_offline", async () => {
        const store = new BitmapPresenceStore()
        const service = new PresenceService(store)
        const user = "507f1f77bcf86cd799439099"

        // Tab 1 connects
        const isOnline1 = await service.onConnect(user)
        expect(isOnline1).toBe(true)
        expect(await service.isOnline(user)).toBe(true)

        // Tab 2 connects (same user)
        const isOnline2 = await service.onConnect(user)
        expect(isOnline2).toBe(false) // already online
        expect(await service.isOnline(user)).toBe(true)

        // Tab 1 closes
        const isOffline1 = await service.onDisconnect(user)
        expect(isOffline1).toBe(false) // still has Tab 2 open
        expect(await service.isOnline(user)).toBe(true)

        // Tab 2 closes
        const isOffline2 = await service.onDisconnect(user)
        expect(isOffline2).toBe(true) // all tabs closed -> now offline
        expect(await service.isOnline(user)).toBe(false)
    })
})

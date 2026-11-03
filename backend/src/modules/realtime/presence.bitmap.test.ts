import { describe, expect, it } from "vitest"
import { MemoryPresenceStore } from "./presence.memory"

describe("local presence fallback", () => {
    it("reads unknown users without mutating online flags", async () => {
        const store = new MemoryPresenceStore()
        const userId = "507f1f77bcf86cd799439011"
        expect(await store.getPresenceBatch([userId])).toEqual({ [userId]: false })
        await store.connect({ userId, socketId: "one" }, 0)
        expect(await store.getPresenceBatch([userId, "other"])).toEqual({ [userId]: true, other: false })
        await store.disconnect({ userId, socketId: "one" })
        expect(await store.getPresenceBatch([userId])).toEqual({ [userId]: false })
    })
})

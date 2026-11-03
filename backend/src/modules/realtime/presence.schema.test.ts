import { describe, expect, it } from "vitest"
import { presenceIdsSchema, presenceQuerySchema } from "./presence.schema"

const userId = "507f1f77bcf86cd799439011"
describe("presence boundaries", () => {
    it("deduplicates valid ids and rejects malformed or unbounded batches", () => {
        expect(presenceIdsSchema.parse([userId, userId])).toEqual([userId])
        expect(presenceIdsSchema.safeParse(["invalid"]).success).toBe(false)
        expect(presenceIdsSchema.safeParse(Array.from({ length: 201 }, () => userId)).success).toBe(false)
        expect(presenceQuerySchema.safeParse({ query: { ids: Array.from({ length: 201 }, () => userId).join(",") } }).success).toBe(false)
        expect(presenceQuerySchema.parse({ query: {} }).query.ids).toEqual([])
    })
})

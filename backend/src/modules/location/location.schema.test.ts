import { describe, expect, it } from "vitest"
import { locationCreateSchema, locationFixSchema } from "./location.schema"

const params = { id: "507f1f77bcf86cd799439011", resourceId: "507f1f77bcf86cd799439012" }
const fix = { latitude: 10, longitude: 106, accuracy: 12, publisherId: "tab-publisher-1" }

describe("foreground location validation", () => {
    it("rejects unbounded coordinates and unsupported duration", () => {
        const body = { ...fix, clientMessageId: "location-command-1", durationMinutes: 15 }
        expect(locationCreateSchema.safeParse({ params, body }).success).toBe(true)
        expect(locationCreateSchema.safeParse({ params, body: { ...body, durationMinutes: 2 } }).success).toBe(false)
        expect(locationCreateSchema.safeParse({ params, body: { ...body, latitude: 91 } }).success).toBe(false)
        expect(locationCreateSchema.safeParse({ params, body: { ...body, accuracy: Infinity } }).success).toBe(false)
    })
    it("requires a positive monotonic sequence", () => {
        expect(locationFixSchema.safeParse({ params, body: { ...fix, sequence: 0 } }).success).toBe(false)
    })
})

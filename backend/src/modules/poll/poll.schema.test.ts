import { describe, expect, it } from "vitest"
import { pollCreateSchema, pollVoteSchema } from "./poll.schema"

const params = { id: "507f1f77bcf86cd799439011", resourceId: "507f1f77bcf86cd799439012" }

describe("poll validation", () => {
    it("rejects duplicate options and fewer than two choices", () => {
        const body = { clientMessageId: "poll-command-1", question: "Where?", mode: "single", options: ["Park", " park "] }
        expect(pollCreateSchema.safeParse({ params, body }).success).toBe(false)
        expect(pollCreateSchema.safeParse({ params, body: { ...body, options: ["Park"] } }).success).toBe(false)
    })
    it("rejects repeated vote option IDs", () => {
        expect(pollVoteSchema.safeParse({ params, body: { optionIds: [params.id, params.id] } }).success).toBe(false)
    })
})

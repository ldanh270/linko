import { describe, expect, it } from "vitest"

import {
    API_ROUTES,
    ROLE,
    SOCKET_EVENTS,
    type ApiFailure,
    type ApiSuccess,
    type EntityId,
} from "@linko/contracts"

describe("shared contracts", () => {
    it("keeps an ObjectId identity as a string at the API boundary", () => {
        const id: EntityId = "507f1f77bcf86cd799439011"
        const response: ApiSuccess<{ id: EntityId }> = {
            success: true,
            data: { id },
            error: null,
            meta: null,
        }

        expect(Object.keys(response).sort()).toEqual(["data", "error", "meta", "success"])
        expect(response.data.id).toBe(id)
    })

    it("uses the same four envelope keys for failures", () => {
        const response: ApiFailure = {
            success: false,
            data: null,
            error: { code: "INTERNAL", message: "Internal server error", requestId: "request-1" },
            meta: null,
        }

        expect(Object.keys(response).sort()).toEqual(["data", "error", "meta", "success"])
        expect(response.error.requestId).toBe("request-1")
    })

    it("shares text roles and route and socket event names", () => {
        expect(ROLE.OWNER).toBe("OWNER")
        expect(ROLE.ADMIN).toBe("ADMIN")
        expect(ROLE.MEMBER).toBe("MEMBER")
        expect(API_ROUTES.AUTH).toBe("/api/auth")
        expect(SOCKET_EVENTS.MESSAGE_CREATED).toBe("message:created")
    })
})

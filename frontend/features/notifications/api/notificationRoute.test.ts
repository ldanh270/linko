import { QueryClient } from "@tanstack/react-query"
import { CONVERSATION_TYPE } from "@linko/contracts"
import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveNotificationRoute } from "./notificationRoute"

const { listInbox } = vi.hoisted(() => ({ listInbox: vi.fn() }))
vi.mock("@/features/inbox/api/inbox.api", () => ({ listInbox }))
afterEach(() => listInbox.mockReset())
const id = "507f1f77bcf86cd799439011"

describe("notification navigation", () => {
  it.each([[CONVERSATION_TYPE.DIRECT, "direct"], [CONVERSATION_TYPE.GROUP, "groups"]])("opens cached %s using its actual type", async (type, segment) => {
    const client = new QueryClient()
    client.setQueryData(["inbox"], { items: [{ id, type }] })
    expect(await resolveNotificationRoute(client, id)).toBe(`/${segment}/${id}`)
    expect(listInbox).not.toHaveBeenCalled()
  })
  it("loads unknown types and preserves selection when lookup fails", async () => {
    const client = new QueryClient()
    listInbox.mockResolvedValueOnce({ items: [{ id, type: CONVERSATION_TYPE.GROUP }] })
    expect(await resolveNotificationRoute(client, id)).toBe(`/groups/${id}`)
    listInbox.mockRejectedValueOnce(new Error("offline"))
    expect(await resolveNotificationRoute(client, id)).toBe(`/inbox?conversation=${id}`)
  })
})

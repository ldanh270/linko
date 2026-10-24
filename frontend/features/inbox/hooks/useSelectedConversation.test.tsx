import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { CONVERSATION_KIND, type InboxItemDto } from "@linko/contracts"
import { INBOX_QUERY_KEY } from "../inbox.constants"
import { useSelectedConversation } from "./useSelectedConversation"

const { listInboxMock } = vi.hoisted(() => ({ listInboxMock: vi.fn() }))
vi.mock("../api/inbox.api", () => ({ listInbox: listInboxMock }))
vi.mock("@/shared/layout/useWorkspaceNavigation", () => ({ useWorkspaceNavigation: () => ({ conversationId: "aaaaaaaaaaaaaaaaaaaaaaaa", isConversationView: true }) }))

describe("selected conversation cache", () => {
  it("should_refresh_a_fresh_cached_miss_before_rejecting_a_new_group", async () => {
    const item = { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } as InboxItemDto
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData([...INBOX_QUERY_KEY, CONVERSATION_KIND.ALL, ""], { items: [], nextCursor: null })
    listInboxMock.mockResolvedValue({ items: [item], nextCursor: null })
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(useSelectedConversation, { wrapper })
    await waitFor(() => expect(result.current.query.data).toEqual(item))
    client.clear()
  })
})

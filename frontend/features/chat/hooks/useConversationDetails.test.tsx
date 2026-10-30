import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import { CONVERSATION_TYPE, ROLE, type InboxItemDto, type MessageDto } from "@linko/contracts"
import { useConversationDetails } from "./useConversationDetails"
import { CHAT_DETAILS_SECTIONS, CHAT_KIND } from "../chat.constants"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/inbox",
  useSearchParams: () => new URLSearchParams(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const directItem: InboxItemDto = {
  id: "c1",
  type: CONVERSATION_TYPE.DIRECT,
  createdAt: "2026-10-24T00:00:00Z",
  updatedAt: "2026-10-24T00:00:00Z",
  participants: [
    { id: "u1", displayName: "Tôi", avatarUrl: null, role: ROLE.MEMBER },
    { id: "u2", displayName: "Alice", avatarUrl: "https://example.com/alice.jpg", role: ROLE.MEMBER },
  ],
  group: null,
  unreadCount: 0,
  lastMessage: null,
}

const groupItem: InboxItemDto = {
  id: "c2",
  type: CONVERSATION_TYPE.GROUP,
  createdAt: "2026-10-24T00:00:00Z",
  updatedAt: "2026-10-24T00:00:00Z",
  participants: [
    { id: "u1", displayName: "Tôi", avatarUrl: null, role: ROLE.OWNER },
    { id: "u2", displayName: "Alice", avatarUrl: null, role: ROLE.MEMBER },
  ],
  group: {
    name: "Nhóm Dự Án",
    description: "Nhóm thảo luận công việc",
    avatarUrl: null,
  },
  unreadCount: 0,
  lastMessage: null,
}

const testMessages: MessageDto[] = [
  {
    id: "m1",
    conversationId: "c1",
    senderId: "u2",
    clientMessageId: "msg-1",
    content: "Xem ảnh nhé",
    replyTo: null,
    mentions: [],
    attachments: [
      { id: "att-1", name: "hinh-anh.png", contentType: "image/png", size: 2048, url: "https://example.com/hinh-anh.png" },
    ],
    createdAt: "2026-10-24T01:00:00Z",
    updatedAt: "2026-10-24T01:00:00Z",
  },
  {
    id: "m2",
    conversationId: "c1",
    senderId: "u1",
    clientMessageId: "msg-2",
    content: "Gửi tài liệu",
    replyTo: null,
    mentions: [],
    attachments: [
      { id: "att-2", name: "bao-cao.pdf", contentType: "application/pdf", size: 5120, url: null },
    ],
    createdAt: "2026-10-24T02:00:00Z",
    updatedAt: "2026-10-24T02:00:00Z",
  },
]

describe("useConversationDetails", () => {
  it("should_map_direct_conversation_identity_and_partition_media_attachments", () => {
    const { result } = renderHook(
      () =>
        useConversationDetails({
          item: directItem,
          kind: CHAT_KIND.DIRECT,
          messages: testMessages,
          authors: [
            { id: "u1", name: "Tôi", avatarUrl: null },
            { id: "u2", name: "Alice", avatarUrl: "https://example.com/alice.jpg" },
          ],
          currentUserId: "u1",
          isOpen: true,
          onClose: vi.fn(),
          onOpenSearch: vi.fn(),
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.title).toBe("Alice")
    expect(result.current.avatarUrl).toBe("https://example.com/alice.jpg")
    expect(result.current.photos).toHaveLength(1)
    expect(result.current.photos[0].name).toBe("hinh-anh.png")
    expect(result.current.files).toHaveLength(1)
    expect(result.current.files[0].name).toBe("bao-cao.pdf")
    expect(result.current.manageHref).toBeNull()
    expect(result.current.peerId).toBe("u2")
    expect(result.current.profileHref).toBe("/profile/u2")
  })

  it("should_map_group_members_and_roles_and_handle_accordion_toggle", () => {
    const { result } = renderHook(
      () =>
        useConversationDetails({
          item: groupItem,
          kind: CHAT_KIND.GROUP,
          messages: [],
          membersData: [
            { userId: "u1", displayName: "Tôi", role: ROLE.OWNER },
            { userId: "u2", displayName: "Alice", role: ROLE.MEMBER },
          ],
          pinsData: [
            {
              id: "m-pinned",
              conversationId: "c2",
              senderId: "u1",
              clientMessageId: "p1",
              content: "Nội quy nhóm",
              replyTo: null,
              mentions: [],
              attachments: [],
              createdAt: "2026-10-24T01:00:00Z",
              updatedAt: "2026-10-24T01:00:00Z",
            },
          ],
          authors: [
            { id: "u1", name: "Tôi", avatarUrl: null },
            { id: "u2", name: "Alice", avatarUrl: null },
          ],
          currentUserId: "u1",
          isOpen: true,
          onClose: vi.fn(),
          onOpenSearch: vi.fn(),
        }),
      { wrapper: createWrapper() }
    )

    expect(result.current.title).toBe("Nhóm Dự Án")
    expect(result.current.description).toBe("Nhóm thảo luận công việc")
    expect(result.current.members).toHaveLength(2)
    expect(result.current.members[0].roleLabel).toBe("Chủ nhóm")
    expect(result.current.members[1].roleLabel).toBe("Thành viên")
    expect(result.current.pins).toHaveLength(1)
    expect(result.current.pins[0].content).toBe("Nội quy nhóm")
    expect(result.current.manageHref).toBe("/groups/c2/manage")
    expect(result.current.invitationsHref).toBe("/groups/c2/invitations")
    expect(result.current.peerId).toBeNull()
    expect(result.current.profileHref).toBeNull()

    act(() => {
      result.current.onToggleSection(CHAT_DETAILS_SECTIONS.PINS)
    })
    expect(result.current.section).toBe(CHAT_DETAILS_SECTIONS.PINS)
  })
})

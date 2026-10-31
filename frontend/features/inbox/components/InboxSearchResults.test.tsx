import { render, screen, fireEvent } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { InboxSearchResults } from "./InboxSearchResults"
import type { ConversationRowViewModel } from "../inbox.types"
import type { FriendDto } from "@linko/contracts"

const MOCK_CONVERSATIONS: ConversationRowViewModel[] = [
  {
    id: "conv-1",
    title: "Bình Trần",
    preview: "Xin chào bạn!",
    timestamp: "2026-10-31T10:00:00Z",
    timeLabel: "10:00",
    unreadCount: 0,
    avatarUrl: undefined,
    href: "/direct/conv-1",
    peerId: "user-binh",
    isGroup: false,
  },
  {
    id: "conv-2",
    title: "Nhóm Dự Án",
    preview: "Lịch họp chiều nay nhé mọi người",
    timestamp: "2026-10-31T09:30:00Z",
    timeLabel: "09:30",
    unreadCount: 2,
    avatarUrl: undefined,
    href: "/groups/conv-2",
    peerId: null,
    isGroup: true,
  },
]

const MOCK_PEOPLE: FriendDto[] = [
  {
    id: "user-duong",
    username: "duongpham",
    displayName: "Dương Phạm",
    avatarUrl: undefined,
  },
]

describe("InboxSearchResults", () => {
  it("renders recent conversations when search input is empty", () => {
    render(
      <InboxSearchResults
        search=""
        recentConversations={MOCK_CONVERSATIONS}
        matchingConversations={[]}
        matchingPeople={[]}
        isSearchingPeople={false}
        isOnline={() => false}
        openingPersonId={null}
        onSelectPerson={vi.fn()}
      />,
    )

    expect(screen.getByText("Gần đây")).toBeInTheDocument()
    expect(screen.getByText("Bình Trần")).toBeInTheDocument()
    expect(screen.getByText("Nhóm Dự Án")).toBeInTheDocument()
  })

  it("renders matching conversations and people when search query is present", () => {
    const onSelectPerson = vi.fn()
    render(
      <InboxSearchResults
        search="Dự án"
        recentConversations={MOCK_CONVERSATIONS}
        matchingConversations={[MOCK_CONVERSATIONS[1]!]}
        matchingPeople={MOCK_PEOPLE}
        isSearchingPeople={false}
        isOnline={() => true}
        openingPersonId={null}
        onSelectPerson={onSelectPerson}
      />,
    )

    expect(screen.getByText("Cuộc trò chuyện (1)")).toBeInTheDocument()
    expect(screen.getByText("Nhóm Dự Án")).toBeInTheDocument()
    expect(screen.getByText("Mọi người (1)")).toBeInTheDocument()
    expect(screen.getByText("Dương Phạm")).toBeInTheDocument()

    // Clicking person triggers callback
    fireEvent.click(screen.getByText("Dương Phạm"))
    expect(onSelectPerson).toHaveBeenCalledWith(MOCK_PEOPLE[0])
  })

  it("renders empty state when nothing matches the query", () => {
    render(
      <InboxSearchResults
        search="không_tồn_tại"
        recentConversations={MOCK_CONVERSATIONS}
        matchingConversations={[]}
        matchingPeople={[]}
        isSearchingPeople={false}
        isOnline={() => false}
        openingPersonId={null}
        onSelectPerson={vi.fn()}
      />,
    )

    expect(screen.getByText("Không tìm thấy kết quả")).toBeInTheDocument()
    expect(
      screen.getByText(/Không có cuộc trò chuyện hoặc người dùng nào khớp với "không_tồn_tại"/),
    ).toBeInTheDocument()
  })
})

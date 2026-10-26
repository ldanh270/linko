import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ConversationSearchBar } from "./ConversationSearchBar"

describe("ConversationSearchBar", () => {
  const dummyMatches = [
    { id: "msg-1", content: "Xin chào bạn nhé", author: "Alice", time: "10:30" },
    { id: "msg-2", content: "Chào buổi sáng", author: "Bob", time: "10:35" },
  ]

  it("renders search input, counter, and navigation buttons", () => {
    const onChange = vi.fn()
    const onNext = vi.fn()
    const onPrev = vi.fn()
    const onSelectMatch = vi.fn()
    const onClose = vi.fn()

    render(
      <ConversationSearchBar
        query="chào"
        onChange={onChange}
        matches={dummyMatches}
        activeIndex={0}
        onNext={onNext}
        onPrev={onPrev}
        onSelectMatch={onSelectMatch}
        onClose={onClose}
      />
    )

    expect(
      screen.getByPlaceholderText("Tìm tin nhắn trong cuộc trò chuyện (Enter để nhảy tiếp)...")
    ).toBeDefined()
    expect(screen.getByText("1")).toBeDefined()
    expect(screen.getByText("/ 2")).toBeDefined()

    const prevBtn = screen.getByTitle("Kết quả trước (Shift + Enter)")
    fireEvent.click(prevBtn)
    expect(onPrev).toHaveBeenCalled()

    const nextBtn = screen.getByTitle("Kết quả tiếp theo (Enter)")
    fireEvent.click(nextBtn)
    expect(onNext).toHaveBeenCalled()

    const closeBtn = screen.getByTitle("Đóng tìm kiếm")
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it("renders 0 kết quả when no match found", () => {
    render(
      <ConversationSearchBar
        query="không có"
        onChange={vi.fn()}
        matches={[]}
        activeIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSelectMatch={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText("0 kết quả")).toBeDefined()
  })

  it("supports dropdown list selection", () => {
    const onSelectMatch = vi.fn()

    render(
      <ConversationSearchBar
        query="chào"
        onChange={vi.fn()}
        matches={dummyMatches}
        activeIndex={0}
        onNext={vi.fn()}
        onPrev={vi.fn()}
        onSelectMatch={onSelectMatch}
        onClose={vi.fn()}
      />
    )

    const listToggleBtn = screen.getByRole("button", { name: /Danh sách kết quả/i })
    fireEvent.click(listToggleBtn)

    expect(screen.getByText("Alice")).toBeDefined()
    expect(screen.getByText("Bob")).toBeDefined()

    const secondItem = screen.getByText("Chào buổi sáng")
    fireEvent.click(secondItem)

    expect(onSelectMatch).toHaveBeenCalledWith(1)
  })
})

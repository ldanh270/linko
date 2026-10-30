import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { EmojiPicker } from "./EmojiPicker"

describe("EmojiPicker", () => {
  it("renders emoji picker with search input and category tabs", () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />)

    expect(screen.getByRole("dialog", { name: "Chọn biểu tượng cảm xúc" })).toBeDefined()
    expect(screen.getByPlaceholderText("Tìm biểu tượng...")).toBeDefined()
    expect(screen.getByText("Cảm xúc")).toBeDefined()
    expect(screen.getByText("Cử chỉ")).toBeDefined()
    expect(screen.getByText("Vật phẩm")).toBeDefined()
  })

  it("selects an emoji and triggers callbacks", () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />)

    const smileBtn = screen.getByRole("button", { name: "cười tươi" })
    fireEvent.click(smileBtn)

    expect(onSelect).toHaveBeenCalledWith("😀")
    expect(onClose).toHaveBeenCalled()
  })

  it("filters emojis when searching", () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />)

    const input = screen.getByPlaceholderText("Tìm biểu tượng...")
    fireEvent.change(input, { target: { value: "tim đỏ" } })

    expect(screen.getByRole("button", { name: "trái tim đỏ" })).toBeDefined()
    expect(screen.queryByRole("button", { name: "cười tươi" })).toBeNull()
  })

  it("closes when pressing Escape key", () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()

    render(<EmojiPicker onSelect={onSelect} onClose={onClose} />)

    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalled()
  })
})

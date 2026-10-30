import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { DropdownMenu } from "./DropdownMenu"

describe("DropdownMenu", () => {
  it("should_close_on_escape_and_restore_focus_without_selecting_an_action", () => {
    const select = vi.fn()
    render(<DropdownMenu label="Tùy chọn" items={[{ label: "Trả lời", onSelect: select }]} />)
    const trigger = screen.getByRole("button", { name: "Tùy chọn" })
    fireEvent.click(trigger)
    expect(screen.getByRole("menuitem", { name: "Trả lời" })).toHaveFocus()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(select).not.toHaveBeenCalled()
  })
})

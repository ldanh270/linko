import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Modal } from "./Modal"

describe("Modal", () => {
  it("should_trap_keyboard_focus_and_restore_the_trigger_on_escape", () => {
    const trigger = document.createElement("button")
    document.body.append(trigger)
    trigger.focus()
    const onClose = vi.fn()
    const view = render(<Modal title="Chỉnh sửa" onClose={onClose}><button>Lưu</button></Modal>)
    const close = screen.getByRole("button", { name: "Đóng" })
    expect(close).toHaveFocus()
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
    expect(screen.getByRole("button", { name: "Lưu" })).toHaveFocus()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalledOnce()
    view.unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })
})

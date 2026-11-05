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
  it("traps and closes only the topmost nested dialog while preserving its parent", () => {
    const parentClose = vi.fn()
    const childClose = vi.fn()
    const view = render(<Modal title="Hoạt động" onClose={parentClose}><input aria-label="Bản nháp cha" defaultValue="giữ nội dung" /><Modal title="Sửa lịch" onClose={childClose}><button>Lưu lịch</button></Modal></Modal>)
    screen.getByRole("button", { name: "Lưu lịch" }).focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(screen.getAllByRole("button", { name: "Đóng" })[1]).toHaveFocus()
    fireEvent.keyDown(document, { key: "Escape" })
    expect(childClose).toHaveBeenCalledOnce()
    expect(parentClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText("Bản nháp cha")).toHaveValue("giữ nội dung")
    view.unmount()
  })
})

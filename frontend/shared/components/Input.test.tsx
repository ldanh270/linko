import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Input } from "./Input"

describe("Input", () => {
  it("renders with semantic label and custom input props", () => {
    render(<Input id="test-field" label="Tên người dùng" placeholder="Nhập tên" />)
    expect(screen.getByLabelText("Tên người dùng")).toBeDefined()
    expect(screen.getByPlaceholderText("Nhập tên")).toBeDefined()
  })

  it("renders endAdornment inside input container and applies padding", () => {
    render(
      <Input
        id="with-adornment"
        label="Mật khẩu"
        endAdornment={<button type="button" aria-label="Xem mật khẩu">icon</button>}
      />
    )
    const input = screen.getByLabelText("Mật khẩu")
    expect(input.className).toContain("pr-11")
    expect(screen.getByRole("button", { name: "Xem mật khẩu" })).toBeDefined()
  })

  it("renders error message and aria-describedby", () => {
    render(<Input id="err-field" label="Email" error="Email không hợp lệ" />)
    const input = screen.getByLabelText("Email")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("alert")).toHaveTextContent("Email không hợp lệ")
  })
})

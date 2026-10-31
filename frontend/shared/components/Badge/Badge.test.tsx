import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Badge } from "./Badge"

describe("Badge component", () => {
  it("renders unread count badge with pill shape and danger variant", () => {
    render(
      <Badge variant="danger" shape="pill" size="sm" aria-label="3 tin chưa đọc">
        3
      </Badge>
    )
    const badge = screen.getByLabelText("3 tin chưa đọc")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent("3")
    expect(badge).toHaveClass("rounded-full")
    expect(badge).toHaveClass("bg-[var(--badge-background)]")
  })

  it("renders brand badge with default rounded shape", () => {
    render(<Badge variant="brand">Linko</Badge>)
    const badge = screen.getByText("Linko")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass("bg-[var(--brand-soft)]")
  })
})

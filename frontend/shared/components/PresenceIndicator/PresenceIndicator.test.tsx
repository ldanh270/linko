import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { PresenceIndicator } from "./PresenceIndicator"

describe("PresenceIndicator component", () => {
  it("renders dot variant with title and aria-label", () => {
    render(<PresenceIndicator isOnline variant="dot" />)
    const dot = screen.getByLabelText("Đang hoạt động")
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass("bg-status-online")
  })

  it("renders text variant with custom offline label", () => {
    render(<PresenceIndicator isOnline={false} variant="text" labelOffline="Không trực tuyến" />)
    expect(screen.getByText("Không trực tuyến")).toBeInTheDocument()
  })

  it("renders badge variant with online classes and label", () => {
    render(<PresenceIndicator isOnline variant="badge" labelOnline="Trực tuyến" />)
    expect(screen.getByText("Trực tuyến")).toBeInTheDocument()
    const badge = screen.getByText("Trực tuyến").parentElement
    expect(badge).toHaveClass("rounded-full")
  })
})

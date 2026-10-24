import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Avatar } from "./Avatar"

describe("Avatar", () => {
  it("should_show_initials_when_the_profile_image_cannot_load", () => {
    render(<Avatar label="Nguyễn An" src="/missing-avatar.jpg" />)
    fireEvent.error(screen.getByRole("img", { name: "Nguyễn An" }))
    expect(screen.getByText("NA")).toBeVisible()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })
})

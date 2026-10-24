import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SearchInput } from "./SearchInput"

describe("SearchInput", () => {
  it("should_discard_a_pending_draft_when_navigation_changes_without_a_search_value_change", async () => {
    const view = render(<SearchInput label="Filter" value="" stateKey="/inbox" onChange={vi.fn()} />)
    const input = screen.getByRole("searchbox", { name: "Filter" })
    await userEvent.type(input, "An")
    view.rerender(<SearchInput label="Filter" value="" stateKey="/inbox?kind=group" onChange={vi.fn()} />)
    expect(input).toHaveValue("")
  })
  it("should_keep_uncommitted_keystrokes_until_the_debounced_url_update_arrives", async () => {
    const change = vi.fn()
    const view = render(<SearchInput label="Tìm" value="" onChange={change} />)
    const input = screen.getByRole("searchbox")
    await userEvent.type(input, "Nguyen")
    expect(input).toHaveValue("Nguyen")
    view.rerender(<SearchInput label="Tìm" value="An" onChange={change} />)
    expect(input).toHaveValue("An")
    fireEvent.change(input, { target: { value: "Anh" } })
    expect(change).toHaveBeenLastCalledWith("Anh")
  })
})

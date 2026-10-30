import { describe, expect, it, vi } from "vitest"
import { findSelectedConversation } from "./inbox.selection"

describe("conversation selection", () => {
  it("should_resolve_a_selection_beyond_the_first_inbox_page", async () => {
    const load = vi.fn().mockResolvedValueOnce({ items: [{ id: "first" }], nextCursor: "older" }).mockResolvedValueOnce({ items: [{ id: "selected" }], nextCursor: null })
    expect(await findSelectedConversation("selected", load)).toEqual({ id: "selected" })
    expect(load).toHaveBeenNthCalledWith(2, "older")
  })
  it("should_finish_when_a_cursor_repeats_without_opening_another_chat", async () => {
    const load = vi.fn().mockResolvedValue({ items: [{ id: "other" }], nextCursor: "repeat" })
    expect(await findSelectedConversation("missing", load)).toBeNull()
    expect(load).toHaveBeenCalledTimes(2)
  })
})

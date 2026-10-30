import { describe, expect, it } from "vitest"
import type { FriendDto } from "@linko/contracts"
import { groupContacts } from "./people.mapper"

describe("contacts", () => {
  it("should_group_vietnamese_names_and_search_without_accents", () => {
    const contacts = [{ id: "1", displayName: "Nguyễn An", username: "an" }, { id: "2", displayName: "Đức Anh", username: "duc" }, { id: "3", displayName: "", username: "unnamed" }] as FriendDto[]
    expect(groupContacts(contacts, "nguyen")).toMatchObject([{ letter: "N", contacts: [{ id: "1" }] }])
    expect(groupContacts(contacts, "").map((group) => group.letter)).toEqual(["D", "N", "U"])
  })
})

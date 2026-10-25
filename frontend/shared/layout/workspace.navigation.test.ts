import { describe, expect, it } from "vitest"
import { getWorkspaceLocation, withConversation } from "./workspace.navigation"

describe("workspace navigation", () => {
  it("should_keep_canonical_selection_when_a_query_names_another_chat", () => {
    expect(getWorkspaceLocation("/direct/aaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbb")).toMatchObject({ conversationId: "aaaaaaaaaaaaaaaaaaaaaaaa", isConversationView: true })
  })
  it("should_reject_invalid_selection_and_keep_profile_visible_on_mobile", () => {
    expect(getWorkspaceLocation("/profile", "../../other")).toMatchObject({ conversationId: "", isConversationView: false })
    expect(getWorkspaceLocation("/profile", "aaaaaaaaaaaaaaaaaaaaaaaa").isConversationView).toBe(false)
  })
  it("should_carry_the_selected_chat_into_other_panels_without_unrelated_filters", () => {
    expect(withConversation("/settings", "aaaaaaaaaaaaaaaaaaaaaaaa")).toBe("/settings?conversation=aaaaaaaaaaaaaaaaaaaaaaaa")
    expect(withConversation("/settings", "bad")).toBe("/settings")
  })
  it("should_treat_profile_people_and_settings_as_full_page_details", () => {
    expect(getWorkspaceLocation("/profile", null).isDetail).toBe(true)
    expect(getWorkspaceLocation("/people", null).isDetail).toBe(true)
    expect(getWorkspaceLocation("/settings", null).isDetail).toBe(true)
    expect(getWorkspaceLocation("/notifications", null).isDetail).toBe(true)
  })
})

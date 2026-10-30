import { describe, expect, it } from "vitest"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { FULL_PAGE_ROUTES } from "@/shared/layout/workspace.navigation"
import { ICON_NAMES } from "@/shared/icons/icon.constants"

describe("notifications feature", () => {
  it("includes /notifications in APP_ROUTES and FULL_PAGE_ROUTES", () => {
    expect(APP_ROUTES.NOTIFICATIONS).toBe("/notifications")
    expect(FULL_PAGE_ROUTES.has("/notifications")).toBe(true)
  })

  it("has BELL icon glyph defined", () => {
    expect(ICON_NAMES.BELL).toBe("notification-3-line")
  })
})

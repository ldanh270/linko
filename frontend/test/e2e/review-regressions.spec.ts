import { expect, test } from "@playwright/test"
import { FIXTURE_IDS, installMessengerFixtures } from "./fixtures/messenger"

test("should_allow_composing_when_older_history_loading_fails", async ({ page }) => {
  await installMessengerFixtures(page, { failOlderHistory: true })
  await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
  await page.getByRole("button", { name: "Tải tin cũ hơn", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Không thể tải tin cũ hơn", exact: true })).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Soạn tin nhắn", exact: true })).toBeEnabled()
  await expect(page.locator(".message-row")).toHaveCount(5)
})

test("should_preserve_cached_identity_and_chat_when_profile_refetch_fails", async ({ page }) => {
  await installMessengerFixtures(page, { failProfileRefetch: true })
  await page.clock.setFixedTime(new Date("2026-10-24T03:00:00Z"))
  await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
  await expect(page.locator(".message-row")).toHaveCount(5)
  await page.clock.setFixedTime(new Date("2026-10-24T03:01:00Z"))
  await page.getByRole("navigation", { name: "Chính", exact: true }).getByRole("link", { name: "Cá nhân", exact: true }).click()
  await expect(page.locator(".workspace-sidebar [role=alert]")).toBeVisible()
  await expect(page.locator(".message-row")).toHaveCount(5)
  await expect(page.getByRole("textbox", { name: "Soạn tin nhắn", exact: true })).toBeEnabled()
})

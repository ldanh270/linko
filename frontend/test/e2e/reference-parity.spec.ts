import { expect, test } from "@playwright/test"
import { FIXTURE_IDS, installMessengerFixtures } from "./fixtures/messenger"

const PANELS = [{ path: "/inbox", heading: "Tin nhắn" }, { path: "/groups", heading: "Nhóm" }, { path: "/people", heading: "Danh bạ" }, { path: "/profile", heading: "Hồ sơ của tôi" }, { path: "/settings", heading: "Cài đặt" }]

for (const width of [1440, 1280, 390]) {
  for (const panel of PANELS) {
    test(`reference ${panel.path} at ${width}px`, async ({ page }, testInfo) => {
      await installMessengerFixtures(page)
      await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 1280 ? 800 : 844 })
      await page.goto(`${panel.path}?conversation=${FIXTURE_IDS.DIRECT}`)
      await expect(page.getByRole("heading", { name: panel.heading, exact: true })).toBeVisible()
      if (width >= 1024) {
        await expect(page.locator(".message-row")).toHaveCount(5)
        await expect(page.locator(".app-rail")).toHaveCSS("width", "75px")
        await expect(page.locator(".workspace-sidebar")).toHaveCSS("width", "380px")
        await expect(page.locator(".message-row--own")).toHaveCount(2)
        await expect.poll(() => page.locator(".composer").evaluate((node) => node.getBoundingClientRect().bottom <= innerHeight)).toBe(true)
      } else await expect(page.locator(".workspace-sidebar")).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
      await page.screenshot({ path: testInfo.outputPath(`${panel.path.slice(1)}-${width}.png`), fullPage: true, animations: "disabled" })
    })
  }
}

for (const width of [768, 1024]) {
  test(`should_switch_navigation_and_chat_at_${width}px`, async ({ page }) => {
    await installMessengerFixtures(page)
    await page.setViewportSize({ width, height: 800 })
    await page.goto(`/settings?conversation=${FIXTURE_IDS.DIRECT}`)
    await expect(page.getByRole("heading", { name: "Cài đặt", exact: true })).toBeVisible()
    await expect(page.getByRole("navigation", { name: width < 1024 ? "Điều hướng di động" : "Chính", exact: true })).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator(".workspace-conversation")).toBeVisible({ visible: width >= 1024 })
  })
}

test("should_preserve_chat_on_panel_navigation_and_restore_back_history", async ({ page }) => {
  await installMessengerFixtures(page, { laterSelection: true })
  await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
  await expect(page.locator(".message-row")).toHaveCount(5)
  await page.getByRole("navigation", { name: "Chính", exact: true }).getByRole("link", { name: "Cài đặt" }).click()
  await expect(page).toHaveURL(`/settings?conversation=${FIXTURE_IDS.DIRECT}`)
  await expect(page.locator(".message-row")).toHaveCount(5)
  await page.reload()
  await expect(page.locator(".message-row")).toHaveCount(5)
  await page.goBack()
  await expect(page).toHaveURL(`/direct/${FIXTURE_IDS.DIRECT}`)
})

test("should_keep_chat_usable_when_contacts_fail", async ({ page }) => {
  await installMessengerFixtures(page, { failFriends: true })
  await page.goto(`/people?conversation=${FIXTURE_IDS.DIRECT}`)
  await expect(page.getByRole("heading", { name: "Không thể tải danh bạ" })).toBeVisible()
  await expect(page.locator(".message-row")).toHaveCount(5)
  await expect(page.getByRole("textbox", { name: "Soạn tin nhắn", exact: true })).toBeEnabled()
})

test("should_preserve_selected_chat_when_opening_the_account_shortcut", async ({ page }) => {
  await installMessengerFixtures(page)
  await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
  await expect(page.locator(".message-row")).toHaveCount(5)
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
  await page.getByRole("link", { name: "Hồ sơ tài khoản", exact: true }).click()
  await expect(page).toHaveURL(`/profile?conversation=${FIXTURE_IDS.DIRECT}`)
  await expect(page.locator(".message-row")).toHaveCount(5)
})

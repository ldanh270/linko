import { expect, test } from "@playwright/test"
import { FIXTURE_IDS, installMessengerFixtures } from "./fixtures/messenger"

const standalonePages = [
  { path: "/settings", heading: "Cài đặt" },
  { path: "/people", heading: "Danh bạ" },
  { path: "/profile", heading: "Hồ sơ của tôi" },
  { path: `/profile/${FIXTURE_IDS.PEER}`, heading: "Doris Brown" },
  { path: "/notifications", heading: "Thông báo" },
] as const

test("URL restores inbox filters and chat details through browser history", async ({ page }) => {
  await installMessengerFixtures(page)
  await page.goto("/inbox")
  await page.getByRole("button", { name: "Nhóm", exact: true }).click()
  await expect(page).toHaveURL(/kind=group/)
  await page.goBack()
  await expect(page).toHaveURL("/inbox")
  await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
  await page.getByRole("button", { name: "Chi tiết cuộc trò chuyện", exact: true }).click()
  await expect(page).toHaveURL(/details=true/)
  await page.goBack()
  await expect(page.getByRole("button", { name: "Chi tiết cuộc trò chuyện", exact: true })).toHaveAttribute("aria-expanded", "false")
})

for (const width of [390, 1440]) {
  for (const hasSelection of [false, true]) {
    test(`standalone routes do not mount or read chat at ${width}px, selection=${hasSelection}`, async ({ page }) => {
      const fixture = await installMessengerFixtures(page)
      await page.setViewportSize({ width, height: 900 })
      for (const route of standalonePages) {
        await page.goto(`${route.path}${hasSelection ? `?conversation=${FIXTURE_IDS.DIRECT}` : ""}`)
        await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible()
        await expect(page.getByRole("region", { name: "Cuộc trò chuyện", exact: true })).toHaveCount(0)
        await expect(page.getByRole("textbox", { name: "Soạn tin nhắn", exact: true })).toHaveCount(0)
        await expect(page.getByRole("log")).toHaveCount(0)
        expect(fixture.readRequests).toHaveLength(0)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      }
    })
  }

  test(`chat selection survives settings, history and refresh at ${width}px`, async ({ page }) => {
    await installMessengerFixtures(page)
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`/direct/${FIXTURE_IDS.DIRECT}`)
    await expect(page.getByRole("textbox", { name: "Soạn tin nhắn", exact: true })).toBeVisible()
    const navigation = page.getByRole("navigation", { name: width < 1024 ? "Điều hướng di động" : "Chính", exact: true })
    await navigation.getByRole("link", { name: "Cài đặt", exact: true }).click()
    await expect(page).toHaveURL(`/settings?conversation=${FIXTURE_IDS.DIRECT}`)
    await expect(page.getByRole("textbox", { name: "Soạn tin nhắn", exact: true })).toHaveCount(0)
    await page.setViewportSize({ width: width < 1024 ? 1440 : 390, height: 900 })
    await expect(page.getByRole("textbox", { name: "Soạn tin nhắn", exact: true })).toHaveCount(0)
    await page.goBack()
    await page.reload()
    await expect(page.getByRole("textbox", { name: "Soạn tin nhắn", exact: true })).toBeVisible()
  })
}

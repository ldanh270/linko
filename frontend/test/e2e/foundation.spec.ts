import { expect, test } from "@playwright/test"
import { API_ROUTES, AUTH_ROUTE_PATHS } from "@linko/contracts"

/** Check navigation, focus and page width at both shell breakpoints. */
for (const width of [360, 1440]) {
  test(`foundation shell works at ${width}px`, async ({ page }) => {
    await page.route(`**${API_ROUTES.AUTH}${AUTH_ROUTE_PATHS.REFRESH}`, (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { accessToken: "foundation-e2e-access-token" },
        error: null,
        meta: null,
      }),
    }))
    await page.setViewportSize({ width, height: 800 })
    await page.goto("/inbox")
    await expect(page.getByRole("heading", { name: "Tin nhắn" })).toBeVisible()
    const navigation = page.getByRole("navigation", { name: width < 768 ? "Điều hướng di động" : "Chính" })
    await expect(navigation).toBeVisible()
    await expect(navigation.getByRole("link", { name: "Tin nhắn" })).toHaveAttribute("aria-current", "page")
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.keyboard.press("Tab")
    await expect(page.locator(":focus-visible")).toHaveCount(1)
  })
}

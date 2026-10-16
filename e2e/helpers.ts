import { expect, type Page, type Response } from "@playwright/test"

/** Cookie-based demo identity (same seam as leasing-path). */
export async function setDemoIdentity(page: Page, userId: string) {
  await page.context().addCookies([
    {
      name: "deskulpt_user",
      value: userId,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
}

export async function gotoMaybe(
  page: Page,
  path: string,
): Promise<{ response: Response | null; missing: boolean }> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" })
  const status = response?.status() ?? 0
  if (status === 404) return { response, missing: true }

  const notFoundHeading = page.getByRole("heading", { name: /not found|404/i })
  if ((await notFoundHeading.count()) > 0 && (await notFoundHeading.first().isVisible())) {
    return { response, missing: true }
  }
  return { response, missing: false }
}

export async function expectPageOk(page: Page) {
  await expect(page.locator("body")).toBeVisible()
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/i)
}

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

/** Platform console unlock cookie (sticky role switcher). */
export async function setAdminIdentity(page: Page, userId = "u_platform_admin") {
  await page.context().addCookies([
    {
      name: "deskulpt_user",
      value: userId,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "deskulpt_admin",
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

/** Same-origin path hrefs from anchors currently in the DOM (strips hash). */
export async function collectSameOriginPaths(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const origin = window.location.origin
    const paths = new Set<string>()
    for (const a of Array.from(document.querySelectorAll("a[href]"))) {
      const raw = a.getAttribute("href")
      if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) {
        continue
      }
      let url: URL
      try {
        url = new URL(raw, origin)
      } catch {
        continue
      }
      if (url.origin !== origin) continue
      const path = `${url.pathname}${url.search}` || "/"
      paths.add(path)
    }
    return Array.from(paths).sort()
  })
}

export function stripHash(path: string): string {
  const i = path.indexOf("#")
  return i >= 0 ? path.slice(0, i) || "/" : path
}

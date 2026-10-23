import { expect, test } from "@playwright/test"
import { expectPageOk, setDemoIdentity } from "./helpers"
import { mintDemoSessionCookie } from "./session"

const L0_EMAIL = "admindeskulpt@gmail.com"
const L0_PASSWORD = process.env.EASYRENTAL_L0_PASSWORD || "DeskulptL0!admin"

async function setAdminCookies(page: import("@playwright/test").Page, userId: string) {
  const value = mintDemoSessionCookie(userId)
  await page.context().addCookies([
    {
      name: "deskulpt_user",
      value,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "deskulpt_admin",
      value,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
}

test.describe("Platform console L0/L1", () => {
  test("anonymous /console redirects to login", async ({ page }) => {
    await page.goto("/console", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveURL(/\/login/)
  })

  test("L0 password login lands on /console with sticky bar", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await page.locator('input[name="email"], input[type="email"]').first().fill(L0_EMAIL)
    await page.locator('input[name="password"], input[type="password"]').first().fill(L0_PASSWORD)
    await page.getByRole("button", { name: /log ?in|sign in/i }).click()
    await page.waitForURL(/\/console/, { timeout: 20_000 })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { name: /platform console/i }).first()).toBeVisible()
    await expect(page.getByTestId("admin-session-bar")).toBeVisible()
    await expect(page.getByTestId("demo-identity")).toBeVisible()
  })

  test("L0 cookie session opens console + can impersonate landlord", async ({ page }) => {
    await setAdminCookies(page, "u_platform_admin")
    await page.goto("/console/tenants", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { name: /landlord tenants/i })).toBeVisible()
    await expect(page.getByTestId("admin-session-bar")).toBeVisible()

    await setDemoIdentity(page, "u_nadia")
    // Impersonation without admin cookie should not keep the bar — re-set admin.
    await setAdminCookies(page, "u_platform_admin")
    await page.context().addCookies([
      {
        name: "deskulpt_user",
        value: mintDemoSessionCookie("u_nadia"),
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ])
    await page.goto("/landlord", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByTestId("admin-session-bar")).toBeVisible()
  })

  test("non-staff cannot open console", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    await page.goto("/console", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveURL(/\/(login)?$|\/landlord/)
    // Soft: either login redirect or landlord (if somehow session kept) — never console chrome.
    await expect(page.getByTestId("admin-session-bar")).toHaveCount(0)
  })
})

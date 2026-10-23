import { expect, test } from "@playwright/test"
import { expectPageOk, setDemoIdentity } from "./helpers"

test.describe("Secure onboarding + desk gates", () => {
  test("anonymous visitor cannot open landlord desk", async ({ page }) => {
    await page.goto("/landlord", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { name: /landlord desk/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /log in/i }).first()).toBeVisible()
    await expect(page.getByTestId("demo-identity")).toHaveCount(0)
  })

  test("signup → role → subscribe → landlord desk", async ({ page }) => {
    const email = `e2e-landlord-${Date.now()}@example.com`
    await page.goto("/signup", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await page.getByTestId("signup-form").getByLabel(/your name/i).fill("E2E Landlord")
    await page.getByTestId("signup-form").getByLabel(/work email/i).fill(email)
    await page.locator('input[name="password"]').fill("Password123!")
    await page.getByTestId("signup-form").getByRole("checkbox").check()
    await page.getByRole("button", { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/onboarding\/role/)

    await page.getByTestId("onboarding-role-form").getByText(/L2 Landlord/i).click()
    await page.getByPlaceholder(/North Ridge/i).fill("E2E Parks India")
    await page.getByRole("button", { name: /continue/i }).click()
    await expect(page).toHaveURL(/\/pricing\/subscribe/)

    await page.getByTestId("subscribe-pick-growth").click()
    await page.getByRole("button", { name: /activate growth/i }).click()
    await expect(page).toHaveURL(/\/landlord/)
    await expect(page.getByText(/E2E Parks India|Portfolio|Overview/i).first()).toBeVisible()
  })

  test("L0 SuperAdmin can open console and impersonate", async ({ page }) => {
    await setDemoIdentity(page, "u_platform_admin")
    await page.context().addCookies([
      {
        name: "deskulpt_admin",
        value: (await page.context().cookies()).find((c) => c.name === "deskulpt_user")!.value,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ])
    await page.goto("/console", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByTestId("admin-session-bar")).toBeVisible()
    await expect(page.getByTestId("demo-identity")).toBeVisible()
  })

  test("L4 cookie cannot open landlord desk", async ({ page }) => {
    await setDemoIdentity(page, "u_maya")
    await page.goto("/landlord", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(
      page.getByText(/Landlord Account|Subscription required|Log in|Wrong desk|for a Landlord/i).first(),
    ).toBeVisible()
  })
})

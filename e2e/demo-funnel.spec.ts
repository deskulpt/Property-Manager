import { expect, test } from "@playwright/test"
import { expectPageOk, setDemoIdentity } from "./helpers"

/**
 * Live-demo critical funnel — no dead ends on primary journeys (demo mode, no vendor keys).
 */
test.describe("Demo funnel — primary journeys", () => {
  test("landing → listings → unit → book visit", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    await expect(page.locator("body")).toContainText(/Easy Rental/i)

    await page.getByRole("link", { name: /browse listings/i }).first().click()
    await expect(page).toHaveURL(/\/listings/)
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()

    await page.goto("/properties/waterman/units/B1", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(/B1/i)
    await expect(page.locator("body")).toContainText(/Waterman|back|property/i)

    await page.goto("/properties/waterman/book", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(
      page.getByTestId("book-visit-form").or(page.getByRole("heading", { level: 1 })).first(),
    ).toBeVisible()
  })

  test("anon desks show login CTAs (no blank RoleGates)", async ({ page }) => {
    for (const path of ["/landlord", "/portal", "/provider", "/inbox", "/shop", "/refer/dashboard"] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await expectPageOk(page)
      await expect(page.getByRole("link", { name: /log in/i }).first()).toBeVisible()
      await expect(page.locator("body")).not.toContainText(/demo header/i)
    }
  })

  test("marketing + partner routes load", async ({ page }) => {
    for (const path of ["/pricing", "/refer", "/partners", "/partners/services", "/about", "/careers"] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await expectPageOk(page)
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    }
  })

  test("signup → role → subscribe → landlord → Ask Easy stub", async ({ page }) => {
    const email = `demo-funnel-${Date.now()}@example.com`
    await page.goto("/signup", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await page.getByTestId("signup-form").getByLabel(/your name/i).fill("Demo Funnel Landlord")
    await page.getByTestId("signup-form").getByLabel(/work email/i).fill(email)
    await page.locator('input[name="password"]').fill("Password123!")
    await page.getByTestId("signup-form").getByRole("checkbox").check()
    await page.getByRole("button", { name: /create account/i }).click()
    await expect(page).toHaveURL(/\/onboarding\/role/)

    await page.getByTestId("onboarding-role-form").getByText(/L2 Landlord/i).click()
    await page.getByPlaceholder(/North Ridge/i).fill("Demo Funnel Parks")
    await page.getByRole("button", { name: /continue/i }).click()
    await expect(page).toHaveURL(/\/pricing\/subscribe/)

    await page.getByTestId("subscribe-pick-growth").click()
    await page.getByRole("button", { name: /activate growth/i }).click()
    await expect(page).toHaveURL(/\/landlord/)
    await expectPageOk(page)

    await page.goto("/landlord/ask", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { name: /landlord assistant|ask easy/i }).first()).toBeVisible()
    await expect(page.locator("body")).toContainText(/stub|Ask Easy|onboard/i)

    await page.goto("/landlord/billing", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { name: /billing/i }).first()).toBeVisible()
  })

  test("seeded desks: landlord Ask Easy, portal, provider, L0 console", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    await page.goto("/landlord/ask", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.locator("body")).toContainText(/Ask Easy|assistant|stub/i)

    await setDemoIdentity(page, "u_devon")
    await page.goto("/portal", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { name: /lease desk|portal|your lease/i }).first()).toBeVisible()

    await setDemoIdentity(page, "u_luis")
    await page.goto("/provider", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()

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
    await expect(page.getByRole("heading", { name: /platform console/i }).first()).toBeVisible()
    await expect(page.getByTestId("admin-session-bar")).toBeVisible()
  })

  test("404 recovery links", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-demo", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: /not on the plan/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /browse listings/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /^home$/i })).toBeVisible()
  })
})

test("home + listings readable on mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/", { waitUntil: "domcontentloaded" })
  await expectPageOk(page)
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
  await page.goto("/listings", { waitUntil: "domcontentloaded" })
  await expectPageOk(page)
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
})

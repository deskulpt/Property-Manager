import { expect, test } from "@playwright/test"
import { expectPageOk, gotoMaybe, setDemoIdentity } from "./helpers"

test.describe("Easy Rental critical paths (India demo)", () => {
  test("home loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    // Brand may be DeSkulpt (main) or Easy Rental (rebrand PR); accept either.
    await expect(page.locator("body")).toContainText(/Easy Rental|DeSkulpt|industrial|leasing|listings/i)
  })

  test("listings load", async ({ page }) => {
    await page.goto("/listings", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    // Seeded Bhiwandi / portfolio content, or empty-state copy — not a blank shell.
    const body = page.locator("body")
    await expect(body).toContainText(/listing|Bhiwandi|unit|sq ?ft|filter|available|bay/i)
  })

  test("auth /login (skip if not shipped)", async ({ page }) => {
    const { missing } = await gotoMaybe(page, "/login")
    test.skip(missing, "/login not on this branch yet (auth slice)")
    await expectPageOk(page)
    await expect(
      page.getByRole("heading", { name: /log ?in|sign in/i }).or(page.getByText(/log ?in|sign in/i)).first(),
    ).toBeVisible()
    // Form fields without submitting (no real OTP / password flow).
    const email = page.locator('input[type="email"], input[name="email"]').first()
    if ((await email.count()) > 0) {
      await expect(email).toBeVisible()
    }
  })

  test("auth /signup (skip if not shipped)", async ({ page }) => {
    const { missing } = await gotoMaybe(page, "/signup")
    test.skip(missing, "/signup not on this branch yet (auth slice)")
    await expectPageOk(page)
    await expect(
      page
        .getByRole("heading", { name: /sign ?up|create (an )?account|register/i })
        .or(page.getByText(/sign ?up|create (an )?account/i))
        .first(),
    ).toBeVisible()
    const email = page.locator('input[type="email"], input[name="email"]').first()
    if ((await email.count()) > 0) {
      await expect(email).toBeVisible()
    }
  })

  test("unit page Matterport embed container", async ({ page }) => {
    await page.goto("/properties/waterman/units/B1", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()

    const walkTab = page.getByRole("tab", { name: /walkthrough/i })
    await expect(walkTab).toBeVisible()
    await walkTab.click()

    const frame = page.locator('iframe[title="Matterport walkthrough"]')
    await expect(frame).toBeVisible({ timeout: 20_000 })
    const src = await frame.getAttribute("src")
    expect(src ?? "").toMatch(/matterport\.com/i)
  })

  test("QR poster route (skip if not shipped)", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    const { missing } = await gotoMaybe(page, "/landlord/poster/u_waterman_b1")
    test.skip(missing, "QR poster route not on this branch yet")
    await expectPageOk(page)
    // Poster ready (QR/canvas/img) or missing-fields banner — both OK.
    const body = page.locator("body")
    await expect(body).toContainText(/poster|QR|print|sq ?ft|contact|address|unit/i)
  })

  test("header phone / WhatsApp utility (skip if absent)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)

    // Header ships responsive duplicates (sm:hidden + sm:flex); assert a visible one.
    const tel = page.locator('a[href^="tel:"]:visible')
    const wa = page.locator(
      'a[href*="wa.me"]:visible, a[href*="whatsapp.com"]:visible, a[href*="api.whatsapp.com"]:visible',
    )
    const telCount = await tel.count()
    const waCount = await wa.count()
    test.skip(telCount === 0 && waCount === 0, "phone/WhatsApp utility strip not on this branch yet")

    if (telCount > 0) {
      await expect(tel.first()).toBeVisible()
      const href = (await tel.first().getAttribute("href")) ?? ""
      expect(href).toMatch(/^tel:\+?91/)
    }
    if (waCount > 0) {
      await expect(wa.first()).toBeVisible()
    }
  })

  test("public header has no demo switcher (L0/L1 sticky bar only)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByTestId("demo-identity")).toHaveCount(0)
    await expect(page.getByTestId("admin-session-bar")).toHaveCount(0)
  })

  test("pricing page + demo subscribe (Growth)", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    await expect(page.locator("body")).toContainText(/No Broker/i)
    await expect(page.getByTestId("pricing-occupant-strip")).toBeVisible()
    await expect(page.getByTestId("plan-card-starter")).toContainText(/₹499|499/)
    await expect(page.getByTestId("plan-card-growth")).toContainText(/₹1,499|1,499|1499/)
    await expect(page.getByTestId("plan-card-pro")).toContainText(/₹2,999|2,999|2999/)
    await expect(page.getByTestId("pricing-gst-note")).toBeVisible()

    await setDemoIdentity(page, "u_nadia")
    await page.goto("/pricing/subscribe?plan=growth&from=e2e", {
      waitUntil: "domcontentloaded",
    })
    await expectPageOk(page)
    await expect(page.getByTestId("subscribe-form")).toBeVisible()
    await expect(page.getByTestId("subscribe-seats")).toBeVisible()
    await page.getByRole("button", { name: /activate growth/i }).click()
    await page.waitForURL(/\/landlord/, { timeout: 20_000 })
    await expectPageOk(page)
  })
})


import { expect, test } from "@playwright/test"

/**
 * Slice A DoD smoke: visitor can Sign up → Create account → landlord desk
 * without picking a seeded demo identity. Reuses Playwright webServer + temp DB.
 */
test.describe("Slice A hosted signup path", () => {
  test.use({
    // Force credentials path for this file's browser context only via extra HTTP headers
    // is not how HOSTED works — instead we exercise signup while demo switcher remains
    // visible in OSS e2e (parity). Hosted switcher-off is covered by unit/mode tests.
  })

  test("sign up, create India org, land on landlord desk", async ({ page }) => {
    const stamp = Date.now()
    const email = `owner-${stamp}@easyrental.example`
    const password = "test-pass-12"

    await page.goto("/signup")
    await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible()
    await page.getByLabel("Full name").fill("Asha Evaluator")
    await page.getByLabel("Work email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Sign up" }).click()

    await expect(page).toHaveURL(/\/create-account/, { timeout: 20_000 })
    await expect(page.getByRole("heading", { name: /Create your landlord account/i })).toBeVisible()

    await page.getByLabel("Organisation legal name").fill(`Eval Parks ${stamp}`)
    await page.getByLabel("City (India)").fill("Pune")
    await page.getByLabel("Entity type").fill("Private limited")
    await page.getByLabel("Acting as").fill("Director")
    await expect(page.getByTestId("create-account-country")).toHaveValue("India")
    await page.getByRole("button", { name: "Create account" }).click()

    await expect(page).toHaveURL(/\/landlord/, { timeout: 20_000 })
    await expect(page.getByText(`Eval Parks ${stamp}`, { exact: true })).toBeVisible()
    // Must not require seeded identities for this path
    await expect(page.getByTestId("demo-identity")).toBeVisible()
  })

  test("log in returns to the same org desk", async ({ page }) => {
    const stamp = Date.now()
    const email = `login-${stamp}@easyrental.example`
    const password = "test-pass-34"

    await page.goto("/signup")
    await page.getByLabel("Full name").fill("Bala Login")
    await page.getByLabel("Work email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Sign up" }).click()
    await expect(page).toHaveURL(/\/create-account/, { timeout: 20_000 })

    await page.getByLabel("Organisation legal name").fill(`Login Yards ${stamp}`)
    await page.getByLabel("City (India)").fill("Chennai")
    await page.getByLabel("Entity type").fill("LLP")
    await page.getByLabel("Acting as").fill("Partner")
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL(/\/landlord/, { timeout: 20_000 })

    await page.goto("/login")
    // Already signed in as landlord → redirect to desk
    await expect(page).toHaveURL(/\/landlord/, { timeout: 15_000 })

    // Clear session cookie and log in fresh
    await page.context().clearCookies()
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible()
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/landlord/, { timeout: 20_000 })
    await expect(page.getByText(`Login Yards ${stamp}`, { exact: true })).toBeVisible()
  })

  test("OSS demo switcher still works for seeded Nadia", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("demo-auth-banner")).toBeVisible()
    await page.context().addCookies([
      {
        name: "deskulpt_user",
        value: "u_nadia",
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ])
    await page.goto("/landlord")
    await expect(page.getByText("BBM Logistics Parks", { exact: true })).toBeVisible()
  })
})

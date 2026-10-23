import { expect, test } from "@playwright/test"
import { setDemoIdentity } from "./helpers"

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

    await page.goto("/signup?flow=org")
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
    // Signup path must not require picking a seeded identity; OSS still shows the demo banner.
    await expect(page.getByTestId("demo-auth-banner")).toBeVisible()
  })

  test("log in returns to the same org desk", async ({ page }) => {
    const stamp = Date.now()
    const email = `login-${stamp}@easyrental.example`
    const password = "test-pass-34"

    await page.goto("/signup?flow=org")
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
    await page.getByRole("textbox", { name: "Email" }).fill(email)
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/landlord/, { timeout: 20_000 })
    await expect(page.getByText(`Login Yards ${stamp}`, { exact: true })).toBeVisible()
  })

  test("OSS demo switcher still works for seeded Nadia", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("demo-auth-banner")).toBeVisible()
    await setDemoIdentity(page, "u_nadia")
    await page.goto("/landlord")
    await expect(page.getByText("DEMO · EasyRent Hyderabad", { exact: true })).toBeVisible()
  })
})

import { expect, test, type Page } from "@playwright/test"
import { mintDemoSessionCookie } from "./session"

async function switchIdentity(page: Page, userId: string) {
  await page.context().addCookies([
    {
      name: "deskulpt_user",
      value: mintDemoSessionCookie(userId),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
  await page.goto("/", { waitUntil: "networkidle" })
  await expect(page.getByTestId("demo-identity")).toHaveValue(userId)
}

test.describe("evaluator leasing path", () => {
  test("home loads, Nadia approves Maya, Maya sees rent", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("body")).toContainText(/Easy Rental|DeSkulpt|DEMO|industrial|landlord/i)

    await switchIdentity(page, "u_nadia")
    await page.goto("/landlord/applications")
    const mayaCard = page.locator("article").filter({ hasText: "Apex Logistics India" })
    await expect(mayaCard).toBeVisible()
    await expect(mayaCard.getByText(/Maya Chen/)).toBeVisible()

    await page.getByTestId("approve-app_maya").click()
    await expect(mayaCard.getByText("Approved")).toBeVisible({ timeout: 15_000 })

    await switchIdentity(page, "u_maya")
    await page.goto("/account")
    const accountCard = page.locator("article").filter({ hasText: "Unit B2" })
    await expect(accountCard).toBeVisible()
    await expect(accountCard.getByText("Approved")).toBeVisible()

    await page.goto("/account/payments")
    await expect(page.locator("table")).toContainText(/Rent/i)
    await expect(page.locator("table")).toContainText(/₹/)
  })
})

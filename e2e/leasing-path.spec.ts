import { expect, test } from "@playwright/test"
import { setDemoIdentity } from "./helpers"

test.describe("evaluator leasing path", () => {
  test("home loads, Nadia approves Maya, Maya sees rent, Jonah inbox empty", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("body")).toContainText(/Easy Rental|DeSkulpt|BBM|industrial|landlord/i)

    // Cookie identity only — sticky demo-identity UI is admin-gated on this tip.
    await setDemoIdentity(page, "u_nadia")
    await page.goto("/landlord/applications")
    const mayaCard = page.locator("article").filter({ hasText: "Apex Logistics India" })
    await expect(mayaCard).toBeVisible()
    await expect(mayaCard.getByText(/Maya Chen/)).toBeVisible()

    await page.getByTestId("approve-app_maya").click()
    await expect(mayaCard.getByText("Approved")).toBeVisible({ timeout: 15_000 })

    await setDemoIdentity(page, "u_maya")
    await page.goto("/account")
    const accountCard = page.locator("article").filter({ hasText: "Unit B2" })
    await expect(accountCard).toBeVisible()
    await expect(accountCard.getByText("Approved")).toBeVisible()

    await page.goto("/account/payments")
    await expect(page.locator("table")).toContainText(/Rent/i)
    await expect(page.locator("table")).toContainText(/₹/)

    await setDemoIdentity(page, "u_jonah")
    await page.goto("/landlord/applications")
    await expect(page.getByText("The inbox is clear")).toBeVisible()
  })
})

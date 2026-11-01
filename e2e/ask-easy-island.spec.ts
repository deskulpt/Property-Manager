import { expect, test } from "@playwright/test"
import { expectPageOk, setDemoIdentity } from "./helpers"

test.describe("Ask Easy floating island", () => {
  test("bubble minimizes, expands, and shows CTA chips", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    await page.goto("/landlord", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)

    const bubble = page.getByTestId("ask-easy-bubble")
    await expect(bubble).toBeVisible()
    await bubble.click()

    const island = page.getByTestId("ask-easy-island")
    await expect(island).toBeVisible()
    await expect(page.getByTestId("ask-easy-cta-row")).toBeVisible()
    await expect(page.getByTestId("ask-easy-cta-listings")).toBeVisible()
    await expect(page.getByTestId("ask-easy-cta-applications")).toBeVisible()
    await expect(page.getByTestId("ask-easy-cta-units")).toBeVisible()
    await expect(page.getByTestId("ask-easy-island-thread")).toBeVisible()

    await page.getByTestId("ask-easy-minimize").click()
    await expect(bubble).toBeVisible()
    await expect(island).toHaveCount(0)

    // Preference persisted — reopen from storage on reload if left open
    await bubble.click()
    await expect(island).toBeVisible()
    await page.reload({ waitUntil: "domcontentloaded" })
    await expect(page.getByTestId("ask-easy-island")).toBeVisible()
  })

  test("/landlord/ask redirects into island open", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    await page.goto("/landlord/ask", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page).toHaveURL(/\/landlord/)
    await expect(page.getByTestId("ask-easy-island")).toBeVisible({ timeout: 15_000 })
  })
})

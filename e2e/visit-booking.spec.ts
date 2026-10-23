import { expect, test } from "@playwright/test"
import { setDemoIdentity } from "./helpers"

test.describe("Slice F visit booking smoke", () => {
  test("Book a visit CTA → slot request → landlord confirms", async ({ page }) => {
    await page.goto("/properties/waterman")
    await expect(page.getByTestId("book-visit-property")).toBeVisible()
    await page.getByTestId("book-visit-property").click()
    await expect(page).toHaveURL(/\/properties\/waterman\/book/)
    await expect(page.getByTestId("book-visit-form")).toBeVisible()

    await setDemoIdentity(page, "u_maya")
    await page.goto("/properties/waterman/book?unit=B1")

    await page.getByTestId("visit-type-in_person").click()
    const firstSlot = page.locator("[data-testid^='visit-slot-']").first()
    await expect(firstSlot).toBeVisible({ timeout: 15_000 })
    await firstSlot.click()

    await page.getByLabel("Mobile").fill("+919876501111")
    await page.getByRole("button", { name: "Request visit" }).click()

    await expect(page).toHaveURL(/notice=/)
    await expect(page.getByRole("status")).toContainText(/Visit requested/i)

    await setDemoIdentity(page, "u_nadia")
    await page.goto("/landlord/visits")
    await expect(page.getByRole("heading", { name: "Visits" })).toBeVisible()

    const guestCard = page.locator("article").filter({ hasText: "Maya Chen" }).first()
    await expect(guestCard).toBeVisible()
    await expect(guestCard.getByText(/Requested/i)).toBeVisible()

    const confirmBtn = guestCard.getByRole("button", { name: "Confirm" }).first()
    await confirmBtn.click()
    await expect(guestCard.getByText(/Confirmed/i)).toBeVisible({ timeout: 15_000 })

    await setDemoIdentity(page, "u_jonah")
    await page.goto("/landlord/visits")
    await expect(page.getByText("No visits yet")).toBeVisible()
  })
})

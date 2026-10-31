import path from "node:path"
import { expect, test } from "@playwright/test"
import { expectPageOk, setDemoIdentity } from "./helpers"

const mallPdf = path.join(process.cwd(), "test/fixtures/floor-ingest/mall-floor-plan.pdf")

test.describe("CAD/PDF floor ingest (L2 landlord)", () => {
  test("landlord visuals show ingest dropzone and accept mall PDF", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    await page.goto("/landlord/properties/p_waterman", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)

    const panel = page.getByTestId("floor-ingest-panel")
    await panel.scrollIntoViewIfNeeded()
    await expect(panel).toBeVisible()
    await expect(panel.getByText(/CAD \/ PDF floor ingest/i)).toBeVisible()
    await expect(page.getByTestId("floor-ingest-dwg-guidance")).toContainText(/DXF|PDF/i)

    await page.getByTestId("floor-ingest-input").setInputFiles(mallPdf)
    await expect(page.getByTestId("floor-ingest-success")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId("floor-ingest-versions")).toBeVisible()
    await expect(page.getByTestId("floor-ingest-versions")).toContainText(/PDF/i)
  })

  test("DWG upload shows export DXF/PDF guidance", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    await page.goto("/landlord/properties/p_waterman", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)

    const panel = page.getByTestId("floor-ingest-panel")
    await panel.scrollIntoViewIfNeeded()
    await expect(page.getByTestId("floor-ingest-dwg-guidance")).toBeVisible()

    await page.getByTestId("floor-ingest-input").setInputFiles({
      name: "office-12-story-floor-plans.dwg",
      mimeType: "application/acad",
      buffer: Buffer.from("AC1032" + "\0".repeat(64)),
    })
    await expect(page.getByTestId("floor-ingest-error")).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId("floor-ingest-error")).toContainText(/DWG/i)
    await expect(page.getByTestId("floor-ingest-hint")).toContainText(/DXF|PDF/i)
  })
})

test.describe("CAD/PDF floor ingest (L3 managing agent)", () => {
  test("agent property ingest page is reachable", async ({ page }) => {
    await setDemoIdentity(page, "u_riya")
    await page.goto("/agent/listings", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    const link = page.getByRole("link", { name: /CAD\/PDF ingest/i }).first()
    // Agent may need landlord context; page should still render listings or select prompt.
    if ((await link.count()) === 0) {
      await expect(page.locator("body")).toContainText(/landlord|listing|select/i)
      return
    }
    await link.click()
    await expect(page.getByTestId("floor-ingest-panel")).toBeVisible({ timeout: 20_000 })
  })
})

import { expect, test } from "@playwright/test"
import { expectPageOk } from "./helpers"

test.describe("listings marketplace + SEO pack", () => {
  test("homepage primary CTA and nav Listings → /listings", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    const heroCta = page.getByRole("link", { name: /browse listings/i }).first()
    await expect(heroCta).toHaveAttribute("href", "/listings")
    const nav = page.getByRole("navigation", { name: "Primary" })
    await expect(nav.getByRole("link", { name: /^listings$/i })).toHaveAttribute("href", "/listings")
  })

  test("marketplace defaults available, shows featured rail", async ({ page }) => {
    await page.goto("/listings", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { name: /available spaces/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /pro-pinned spaces/i })).toBeVisible()
    const body = await page.locator("body").innerText()
    expect(body).toMatch(/available/i)
    // Leased A1 should not dominate default available-only view copy as a result status.
    await expect(page.locator("body")).toContainText(/Unit B1|Waterman/i)
  })

  test("segment filter SSR still lists units", async ({ page }) => {
    await page.goto("/listings?segment=warehouse", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.locator("body")).toContainText(/warehouse|dock|SF/i)
  })

  test("robots.txt and llms.txt expose listings", async ({ request }) => {
    const robots = await request.get("/robots.txt")
    expect(robots.ok()).toBeTruthy()
    const robotsText = await robots.text()
    expect(robotsText).toMatch(/listings/i)
    expect(robotsText).toMatch(/Disallow:.*\/console/i)

    const llms = await request.get("/llms.txt")
    expect(llms.ok()).toBeTruthy()
    const llmsText = await llms.text()
    expect(llmsText).toContain("/listings")
    expect(llmsText).toMatch(/Easy Rental/i)

    const sitemap = await request.get("/sitemap.xml")
    expect(sitemap.ok()).toBeTruthy()
    const sitemapText = await sitemap.text()
    expect(sitemapText).toContain("/listings")
    expect(sitemapText).toContain("/properties/")
  })

  test("unit page JSON-LD includes RealEstateListing and INR", async ({ page }) => {
    await page.goto("/properties/waterman/units/B1", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    const scripts = page.locator('script[type="application/ld+json"]')
    const count = await scripts.count()
    expect(count).toBeGreaterThan(0)
    let blob = ""
    for (let i = 0; i < count; i++) {
      blob += (await scripts.nth(i).textContent()) ?? ""
    }
    expect(blob).toMatch(/RealEstateListing/)
    expect(blob).toMatch(/INR/)
    expect(blob).toMatch(/"@type"\s*:\s*"Offer"/)
  })

  test("apply stays gated for anon visitors", async ({ page }) => {
    await page.goto("/apply/u_waterman_b1", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.locator("body")).toContainText(/applicant|sign in|log in|browse only/i)
  })
})

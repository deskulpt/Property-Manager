import { expect, test } from "@playwright/test"

test.describe("listings public map (Slice E residual)", () => {
  test("listings OSM map and property §6.14 deep-links with entrance Directions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto("/listings", { waitUntil: "networkidle" })

    const mapPanel = page.getByTestId("listings-map-panel")
    await expect(mapPanel).toBeVisible()
    await expect
      .poll(async () => page.locator(".leaflet-container").count())
      .toBeGreaterThan(0)

    await page.goto("/properties/waterman", { waitUntil: "networkidle" })
    await expect(page.getByTestId("map-actions")).toBeVisible()
    await expect(page.getByTestId("map-link-directions")).toHaveAttribute(
      "href",
      /destination=19\.2805/,
    )
    await expect(page.getByTestId("map-link-street-view")).toHaveAttribute(
      "href",
      /map_action=pano|google\.com\/maps/,
    )
    await expect(page.getByTestId("map-link-open")).toHaveAttribute(
      "href",
      /google\.com\/maps\/search/,
    )
    await expect(page.getByRole("link", { name: /OpenStreetMap/i })).toBeVisible()
  })
})

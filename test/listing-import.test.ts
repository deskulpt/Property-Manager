import { beforeEach, describe, expect, it } from "vitest"
import { adapterForSite, resolveAdapter } from "@/lib/import/adapters"
import { readFixtureHtml } from "@/lib/import/fixtures"
import { LISTING_SITE_IDS, siteById } from "@/lib/import/listing-schema"
import { resetImportRateLimits } from "@/lib/import/rate-limit"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("listing URL import adapters", () => {
  it.each([...LISTING_SITE_IDS])("parses fixture for %s", (siteId) => {
    const site = siteById(siteId)
    const html = readFixtureHtml(siteId)
    const url = new URL(site.exampleUrl)
    const adapter = adapterForSite(siteId)
    expect(adapter.canHandle(url)).toBe(true)
    const listing = adapter.parse(html, url)
    expect(listing.sourceSite).toBe(siteId)
    expect(listing.title.length).toBeGreaterThan(3)
    expect(listing.sqft).toBeGreaterThan(100)
    expect(listing.currency).toBe(site.currency)
    expect(listing.city.length).toBeGreaterThan(1)
    expect(listing.postalCode.length).toBeGreaterThan(2)
  })

  it("rejects host mismatch for preferred site", () => {
    const url = new URL("https://www.nobroker.in/foo")
    expect(resolveAdapter(url, "kijiji")).toBeNull()
    expect(resolveAdapter(url, "nobroker")?.id).toBe("nobroker")
  })
})

describe("listing import drafts", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
    resetImportRateLimits()
  })

  it("creates a draft property + pending unit for the tenant", async () => {
    const { fetchAndParseListing } = await import("@/lib/import/fetch-listing")
    const { createDraftFromImport, listImportDrafts } = await import("@/lib/import/drafts")
    const { listPortfolio } = await db()

    const fetched = await fetchAndParseListing({
      siteId: "nobroker",
      url: "https://www.nobroker.in/property/rent/mumbai/demo-bay-a2",
      forceFixture: true,
    })
    expect(fetched.usedFixture).toBe(true)

    const created = createDraftFromImport({
      tenantId: "t_bbm",
      actorId: "u_nadia",
      listing: fetched.listing,
      usedFixture: true,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const portfolio = listPortfolio().filter((p) => p.tenantId === "t_bbm")
    expect(portfolio.some((p) => p.id === created.draft.propertyId)).toBe(true)
    const prop = portfolio.find((p) => p.id === created.draft.propertyId)!
    expect(prop.units[0]?.status).toBe("pending")
    expect(listImportDrafts("t_bbm").some((d) => d.id === created.draft.id)).toBe(true)
  })

  it("managing agent seed can access the demo landlord only", async () => {
    const { agentCanAccessTenant, agentLandlords } = await import("@/lib/agent-context")
    const landlords = agentLandlords("u_riya")
    expect(landlords.map((l) => l.id)).toEqual(["t_bbm"])
    expect(agentCanAccessTenant("u_riya", "t_bbm")).toBe(true)
    expect(agentCanAccessTenant("u_riya", "t_unknown")).toBe(false)
  })
})

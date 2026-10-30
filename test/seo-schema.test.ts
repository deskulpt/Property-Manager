import { beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"
import {
  listingsItemListJsonLd,
  organizationJsonLd,
  unitRealEstateListingJsonLd,
  websiteSearchActionJsonLd,
} from "@/lib/schema-org"
import { listingsShouldNoIndex } from "@/lib/seo"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("SEO / schema.org (SEO-0)", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("emits WebSite SearchAction targeting /listings?q=", () => {
    const site = websiteSearchActionJsonLd()
    expect(site["@type"]).toBe("WebSite")
    const action = site.potentialAction as Record<string, unknown>
    expect(action["@type"]).toBe("SearchAction")
    const target = action.target as Record<string, unknown>
    expect(String(target.urlTemplate)).toContain("/listings?q={search_term_string}")
  })

  it("emits Organization with Easy Rental / DeSkulpt", () => {
    const org = organizationJsonLd()
    expect(org.name).toBe("Easy Rental")
    expect(org.legalName).toBe("DeSkulpt Inc")
    expect(org.logo).toContain("/logo.png")
  })

  it("builds ItemList from available listings", async () => {
    const { searchListings } = await db()
    const cards = searchListings({ statuses: ["available"] })
    const list = listingsItemListJsonLd(cards)
    expect(list["@type"]).toBe("CollectionPage")
    const main = list.mainEntity as Record<string, unknown>
    expect(main["@type"]).toBe("ItemList")
    expect(main.numberOfItems).toBe(cards.length)
    const elements = main.itemListElement as Record<string, unknown>[]
    expect(elements.length).toBeGreaterThan(0)
    expect(String(elements[0]!.url)).toContain("/properties/")
  })

  it("parameterizes RealEstateListing + Offer INR from unit/property", async () => {
    const { getUnitPage } = await db()
    const page = getUnitPage("waterman", "B1")
    expect(page).toBeTruthy()
    if (!page) return
    const ld = unitRealEstateListingJsonLd({
      property: {
        name: page.property.name,
        slug: page.property.slug,
        address: page.property.address,
        area: page.property.area,
        cityLine: page.property.cityLine,
        pinCode: page.property.pinCode,
        latitude: page.property.latitude,
        longitude: page.property.longitude,
        segment: page.property.segment,
        tenantName: page.property.tenantName,
      },
      unit: page.unit,
    })
    expect(ld["@type"]).toBe("RealEstateListing")
    const offers = ld.offers as Record<string, unknown>
    expect(offers["@type"]).toBe("Offer")
    expect(offers.priceCurrency).toBe("INR")
    expect(Number(offers.price)).toBeGreaterThan(0)
  })

  it("marks free-text and geo query pages noindex", () => {
    expect(listingsShouldNoIndex({ q: "jubilee" })).toBe(true)
    expect(listingsShouldNoIndex({ lat: 19.2, lng: 73.0 })).toBe(true)
    expect(listingsShouldNoIndex({})).toBe(false)
  })
})

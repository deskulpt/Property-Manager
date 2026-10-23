import { beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("listings marketplace (MKT-0)", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("defaults available-only when statuses are set to available", async () => {
    const { searchListings } = await db()
    const available = searchListings({ statuses: ["available"] })
    expect(available.length).toBeGreaterThan(0)
    expect(available.every((card) => card.status === "available")).toBe(true)
    expect(available.some((card) => card.status === "leased")).toBe(false)
  })

  it("returns Pro featured pins and sorts featured first", async () => {
    const { searchListings } = await db()
    const featured = searchListings({ statuses: ["available"], featured: true })
    expect(featured.length).toBeGreaterThan(0)
    expect(featured.every((card) => card.featured)).toBe(true)
    expect(featured.some((card) => card.code === "B1")).toBe(true)

    const sorted = searchListings({ statuses: ["available"], sort: "featured" })
    expect(sorted[0]?.featured).toBe(true)
  })

  it("sorts by newest listed_at", async () => {
    const { searchListings } = await db()
    const newest = searchListings({ statuses: ["available"], sort: "newest" })
    expect(newest.length).toBeGreaterThan(1)
    const times = newest.map((card) => (card.listedAt ? Date.parse(card.listedAt) : 0))
    for (let i = 1; i < times.length; i++) {
      expect(times[i - 1]).toBeGreaterThanOrEqual(times[i])
    }
  })

  it("filters by segment and amenity chips", async () => {
    const { searchListings } = await db()
    const docks = searchListings({
      statuses: ["available"],
      segment: "warehouse",
      amenities: ["dock"],
    })
    expect(docks.length).toBeGreaterThan(0)
    expect(docks.every((card) => card.segment === "warehouse" && card.docks > 0)).toBe(true)

    const walkthrough = searchListings({
      statuses: ["available"],
      amenities: ["matterport"],
    })
    expect(walkthrough.every((card) => Boolean(card.matterportUrl))).toBe(true)
  })

  it("computes distance when lat/lng exist on properties", async () => {
    const { searchListings } = await db()
    // Near Bhiwandi / Waterman demo coords when seeded
    const near = searchListings({
      statuses: ["available"],
      lat: 19.28,
      lng: 73.06,
      radiusKm: 80,
      sort: "distance",
    })
    expect(near.length).toBeGreaterThan(0)
    expect(near.every((card) => card.distanceKm != null && card.distanceKm <= 80)).toBe(true)
    if (near.length > 1) {
      expect(near[0]!.distanceKm!).toBeLessThanOrEqual(near[1]!.distanceKm!)
    }
  })
})

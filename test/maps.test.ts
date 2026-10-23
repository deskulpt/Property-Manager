import { describe, expect, it } from "vitest"
import {
  areaCentre,
  buildMapLinks,
  mapLinkContainsNoApiKey,
  resolveDirectionsPin,
  resolvePublicPin,
  validateMapPin,
} from "@/lib/maps"
import { useTempDatabase } from "./helpers/temp-db"

useTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("map pin validation", () => {
  it("accepts a valid pair and clears both nulls", () => {
    expect(validateMapPin(19.3, 73.06)).toEqual({
      ok: true,
      latitude: 19.3,
      longitude: 73.06,
    })
    expect(validateMapPin("", "")).toEqual({ ok: true, latitude: null, longitude: null })
  })

  it("rejects lat 91 and lng 200 with plain-language errors", () => {
    expect(validateMapPin(91, 73)).toMatchObject({ ok: false })
    expect(validateMapPin(19, 200)).toMatchObject({ ok: false })
    expect(String((validateMapPin(91, 73) as { error: string }).error)).toMatch(/Latitude/i)
    expect(String((validateMapPin(19, 200) as { error: string }).error)).toMatch(/Longitude/i)
  })

  it("rejects NaN and half-filled pairs", () => {
    expect(validateMapPin("abc", 73)).toMatchObject({ ok: false })
    expect(validateMapPin(19, "")).toMatchObject({ ok: false })
  })
})

describe("§6.14 map link builders", () => {
  const base = {
    latitude: 19.2813,
    longitude: 73.0483,
    address: "Plot 19, Kalyan-Bhiwandi Road, Bhiwandi, Maharashtra 421302",
    name: "Demo Bhiwandi Hub",
    entranceLatitude: 19.2805,
    entranceLongitude: 73.047,
    entranceLabel: "Truck gate 2",
  }

  it("builds Directions, Street View, and Open in maps without API keys", () => {
    const links = buildMapLinks(base)
    expect(links.directions).toContain("google.com/maps/dir/")
    expect(links.directions).toContain("destination=19.2805%2C73.047")
    expect(links.streetView).toContain("map_action=pano")
    expect(links.openInMaps).toContain("query=19.2813%2C73.0483")
    expect(links.appleMaps).toContain("maps.apple.com")
    expect(links.waze).toContain("waze.com")
    expect(links.openStreetMap).toContain("openstreetmap.org")
    for (const url of [
      links.directions,
      links.streetView,
      links.openInMaps,
      links.appleMaps,
      links.waze,
      links.openStreetMap,
    ]) {
      expect(mapLinkContainsNoApiKey(url)).toBe(true)
    }
    expect(links.directionsTargetLabel).toBe("Truck gate 2")
  })

  it("falls back to address search when pin is missing", () => {
    const links = buildMapLinks({
      latitude: null,
      longitude: null,
      address: "Plot 19, Bhiwandi",
    })
    expect(links.usedAddressFallback).toBe(true)
    expect(links.openInMaps).toContain(encodeURIComponent("Plot 19, Bhiwandi"))
    expect(links.pin).toBeNull()
  })

  it("honours hide_exact_pin with area centre", () => {
    const pin = resolvePublicPin({ ...base, hideExactPin: true })
    expect(pin).toEqual(areaCentre({ lat: 19.2813, lng: 73.0483 }))
    const directions = resolveDirectionsPin({ ...base, hideExactPin: true })
    expect(directions.pin).toEqual(pin)
    expect(directions.label).toBeNull()
  })
})

describe("seeded property pins and save rejection", () => {
  it("seeded waterman has entrance pin and listings expose coordinates", async () => {
    const { getPropertyBySlug, searchListings, closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
    const property = getPropertyBySlug("waterman")
    expect(property?.latitude).toBeCloseTo(19.2813)
    expect(property?.longitude).toBeCloseTo(73.0483)
    expect(property?.entranceLabel).toBe("Truck gate 2")
    const cards = searchListings({ q: "B1" })
    expect(cards.some((card) => card.propertySlug === "waterman" && card.latitude != null)).toBe(
      true,
    )
  })

  it("savePropertyPin rejects cross-tenant writes and accepts valid coords", async () => {
    const { savePropertyPin, propertyForLandlord, closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
    expect(
      savePropertyPin("t_harbour", "p_waterman", {
        latitude: 12,
        longitude: 77,
        entranceLatitude: null,
        entranceLongitude: null,
        entranceLabel: null,
        hideExactPin: false,
      }).ok,
    ).toBe(false)

    const saved = savePropertyPin("t_bbm", "p_powai", {
      latitude: 12.97,
      longitude: 77.75,
      entranceLatitude: null,
      entranceLongitude: null,
      entranceLabel: null,
      hideExactPin: true,
    })
    expect(saved.ok).toBe(true)
    const property = propertyForLandlord("t_bbm", "p_powai")
    expect(property?.hideExactPin).toBe(true)
    expect(property?.latitude).toBeCloseTo(12.97)
  })
})

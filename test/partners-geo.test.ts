import { describe, expect, it } from "vitest"
import { areaCoversProperty, extractPin, haversineKm } from "@/lib/partners/geo"

describe("partner geo matching", () => {
  it("extracts Indian PIN codes", () => {
    expect(extractPin("Hinjewadi, Pune 411057")).toBe("411057")
    expect(extractPin("no pin here")).toBeNull()
  })

  it("matches PIN prefix catchment", () => {
    expect(
      areaCoversProperty(
        {
          pinPrefix: "4110",
          citySlug: null,
          radiusKm: null,
          homeLat: null,
          homeLng: null,
          active: true,
        },
        {
          id: "p",
          name: "Pune",
          area: "Hinjewadi",
          pinCode: "411057",
          latitude: 18.59,
          longitude: 73.73,
        },
      ),
    ).toBe(true)
  })

  it("rejects outside PIN / city", () => {
    expect(
      areaCoversProperty(
        {
          pinPrefix: "4110",
          citySlug: "Hinjewadi",
          radiusKm: 20,
          homeLat: 18.52,
          homeLng: 73.85,
          active: true,
        },
        {
          id: "powai",
          name: "Powai",
          area: "Powai",
          pinCode: "400076",
          latitude: 19.12,
          longitude: 72.9,
        },
      ),
    ).toBe(false)
  })

  it("haversine roughly Pune↔Mumbai > 100km", () => {
    const km = haversineKm(18.52, 73.85, 19.12, 72.9)
    expect(km).toBeGreaterThan(100)
  })
})

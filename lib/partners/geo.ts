import type { PartnerServiceArea, PropertyGeo } from "@/lib/partners/types"

const EARTH_KM = 6371

/** Haversine distance in km between two WGS84 points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Extract a 6-digit Indian PIN from free text (address / city_line). */
export function extractPin(text: string | null | undefined): string | null {
  if (!text) return null
  const match = text.match(/\b([1-9][0-9]{5})\b/)
  return match ? match[1] : null
}

/**
 * True when a catchment covers the property:
 * - pin_prefix matches property PIN (prefix), or
 * - city_slug equals property area (case-insensitive), or
 * - haversine ≤ radius_km from home base when both coords exist
 */
export function areaCoversProperty(
  area: Pick<
    PartnerServiceArea,
    "pinPrefix" | "citySlug" | "radiusKm" | "homeLat" | "homeLng" | "active"
  >,
  property: PropertyGeo,
): boolean {
  if (!area.active) return false

  const pin = property.pinCode
  const prefix = area.pinPrefix?.trim()
  if (prefix && pin && pin.startsWith(prefix)) return true

  const city = area.citySlug?.trim().toLowerCase()
  if (city && property.area.trim().toLowerCase() === city) return true

  const radius = area.radiusKm
  if (
    radius != null &&
    radius > 0 &&
    area.homeLat != null &&
    area.homeLng != null &&
    property.latitude != null &&
    property.longitude != null
  ) {
    return (
      haversineKm(area.homeLat, area.homeLng, property.latitude, property.longitude) <=
      radius
    )
  }

  return false
}

export function anyAreaCoversProperty(
  areas: PartnerServiceArea[],
  property: PropertyGeo,
): boolean {
  return areas.some((area) => areaCoversProperty(area, property))
}

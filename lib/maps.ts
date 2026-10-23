/**
 * Public map helpers — Leaflet/OSM embed + §6.14 deep-links.
 * Zero API keys on the default path. No Mapbox / Google Maps JS SDK.
 */

export type MapPin = {
  lat: number
  lng: number
}

export type LatLng = MapPin

export type MapPinInput = {
  latitude: number | null
  longitude: number | null
  address: string
  name?: string
  /** Prefer for Directions when set (§6.14 entrance/gate pin). */
  entranceLatitude?: number | null
  entranceLongitude?: number | null
  entranceLabel?: string | null
  /** When true, public surfaces use area centre instead of the exact pin. */
  hideExactPin?: boolean
}

export type MapLinkSet = {
  directions: string
  streetView: string
  openInMaps: string
  appleMaps: string
  waze: string
  openStreetMap: string
  /** Coordinates actually used after privacy / entrance resolution, or null if address-only. */
  pin: LatLng | null
  usedAddressFallback: boolean
  directionsTargetLabel: string | null
}

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer" target="_blank">OpenStreetMap</a>'

/** Default OSM raster tiles — no key. Switch via env for keyed CDN at scale. */
export function osmTileUrl() {
  return (
    process.env.NEXT_PUBLIC_OSM_TILE_URL?.trim() ||
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  )
}

export function osmAttribution() {
  return process.env.NEXT_PUBLIC_OSM_ATTRIBUTION?.trim() || OSM_ATTRIBUTION
}

export function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90
}

export function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180
}

export function isValidMapPin(lat: unknown, lng: unknown): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng)
}

export function asMapPin(lat: number | null, lng: number | null): MapPin | null {
  if (!isValidMapPin(lat, lng)) return null
  return { lat: lat as number, lng: lng as number }
}

export function parseCoordinate(raw: unknown): number | null {
  if (raw == null || raw === "") return null
  const n = typeof raw === "number" ? raw : Number(String(raw).trim())
  return Number.isFinite(n) ? n : Number.NaN
}

export type PinValidation =
  | { ok: true; latitude: number | null; longitude: number | null }
  | { ok: false; error: string }

/**
 * Validate a building pin pair. Both null is OK (no pin). One without the other fails.
 * Out-of-range or NaN fails with plain-language copy.
 */
export function validateMapPin(latitudeRaw: unknown, longitudeRaw: unknown): PinValidation {
  const lat = parseCoordinate(latitudeRaw)
  const lng = parseCoordinate(longitudeRaw)

  if (lat === null && lng === null) {
    return { ok: true, latitude: null, longitude: null }
  }
  if (lat === null || lng === null) {
    return {
      ok: false,
      error: "Set both latitude and longitude, or clear both to remove the map pin.",
    }
  }
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, error: "Latitude and longitude must be numbers." }
  }
  if (!isValidLatitude(lat)) {
    return { ok: false, error: "Latitude must be between −90 and 90." }
  }
  if (!isValidLongitude(lng)) {
    return { ok: false, error: "Longitude must be between −180 and 180." }
  }
  return { ok: true, latitude: lat, longitude: lng }
}

/** Round to ~1 km area centre when hide_exact_pin is on (proposed privacy). */
export function areaCentre(pin: LatLng): LatLng {
  return {
    lat: Math.round(pin.lat * 100) / 100,
    lng: Math.round(pin.lng * 100) / 100,
  }
}

function pair(lat: number | null | undefined, lng: number | null | undefined): LatLng | null {
  if (!isValidLatitude(lat ?? NaN) || !isValidLongitude(lng ?? NaN)) return null
  return { lat: lat as number, lng: lng as number }
}

/**
 * Resolve the public display pin (respects hide_exact_pin).
 * Does not prefer the entrance — entrance is Directions-only.
 */
export function resolvePublicPin(input: MapPinInput): LatLng | null {
  const building = pair(input.latitude, input.longitude)
  if (!building) return null
  return input.hideExactPin ? areaCentre(building) : building
}

/** Directions destination: entrance gate when set, else building (or area centre). */
export function resolveDirectionsPin(input: MapPinInput): {
  pin: LatLng | null
  label: string | null
} {
  const entrance = pair(input.entranceLatitude, input.entranceLongitude)
  if (entrance && !input.hideExactPin) {
    return {
      pin: entrance,
      label: input.entranceLabel?.trim() || "Entrance",
    }
  }
  const publicPin = resolvePublicPin(input)
  return { pin: publicPin, label: null }
}

function enc(value: string) {
  return encodeURIComponent(value)
}

export function googleMapsOpenUrl(pin: MapPin): string {
  return `https://www.google.com/maps/search/?api=1&query=${pin.lat}%2C${pin.lng}`
}

export function googleMapsDirectionsUrl(pin: MapPin): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${pin.lat}%2C${pin.lng}`
}

export function googleMapsStreetViewUrl(pin: MapPin): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${pin.lat}%2C${pin.lng}`
}

export function openStreetMapUrl(pin: MapPin): string {
  return `https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lng}#map=16/${pin.lat}/${pin.lng}`
}

export function appleMapsUrl(pin: MapPin): string {
  return `https://maps.apple.com/?ll=${pin.lat},${pin.lng}&q=${pin.lat},${pin.lng}`
}

export function wazeUrl(pin: MapPin): string {
  return `https://waze.com/ul?ll=${pin.lat}%2C${pin.lng}&navigate=yes`
}

/**
 * Build §6.14 deep-links. Google Maps URL patterns with no API key.
 * Address fallback when no valid pin exists.
 */
export function buildMapLinks(input: MapPinInput): MapLinkSet {
  const display = resolvePublicPin(input)
  const { pin: directionsPin, label } = resolveDirectionsPin(input)
  const address = input.address.trim()
  const usedAddressFallback = !display

  const query = display ? `${display.lat},${display.lng}` : address
  const destination = directionsPin
    ? `${directionsPin.lat},${directionsPin.lng}`
    : address
  const viewpoint = display ?? directionsPin

  return {
    directions: `https://www.google.com/maps/dir/?api=1&destination=${enc(destination)}&travelmode=driving`,
    streetView: viewpoint
      ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${viewpoint.lat},${viewpoint.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${enc(address)}`,
    openInMaps: `https://www.google.com/maps/search/?api=1&query=${enc(query)}`,
    appleMaps: display
      ? `https://maps.apple.com/?ll=${display.lat},${display.lng}&q=${enc(input.name || address)}`
      : `https://maps.apple.com/?q=${enc(address)}`,
    waze: display
      ? `https://waze.com/ul?ll=${display.lat}%2C${display.lng}&navigate=yes`
      : `https://waze.com/ul?q=${enc(address)}`,
    openStreetMap: display
      ? `https://www.openstreetmap.org/?mlat=${display.lat}&mlon=${display.lng}#map=16/${display.lat}/${display.lng}`
      : `https://www.openstreetmap.org/search?query=${enc(address)}`,
    pin: display,
    usedAddressFallback,
    directionsTargetLabel: label,
  }
}

export function mapLinkContainsNoApiKey(url: string) {
  return !/[?&]key=/.test(url)
}

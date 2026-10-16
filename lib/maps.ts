/**
 * Key-free map deep-links (PRD §6.14 / SaaS §13).
 * In-page map uses Leaflet + OSM; clicks open generic Google Maps URLs.
 */

export type MapPin = {
  lat: number
  lng: number
}

export function isValidMapPin(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -90 || lat > 90) return false
  if (lng < -180 || lng > 180) return false
  return true
}

export function asMapPin(lat: number | null, lng: number | null): MapPin | null {
  if (!isValidMapPin(lat, lng)) return null
  return { lat: lat as number, lng: lng as number }
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

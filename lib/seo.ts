/** Sitewide SEO helpers — absolute URLs, titles, robots meta for facet pages. */

export const SITE_ORIGIN = "https://easyrental.space"
export const SITE_NAME = "Easy Rental"
export const ORG_LEGAL_NAME = "DeSkulpt Inc"

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${SITE_ORIGIN}${normalized}`
}

export function listingsCanonical(searchParams?: {
  segment?: string
  area?: string
  featured?: boolean
}): string {
  const next = new URLSearchParams()
  if (searchParams?.segment) next.set("segment", searchParams.segment)
  if (searchParams?.area) next.set("area", searchParams.area)
  if (searchParams?.featured) next.set("featured", "1")
  const qs = next.toString()
  return absoluteUrl(qs ? `/listings?${qs}` : "/listings")
}

/** Free-text and geo query junk should not be indexed as unique URLs. */
export function listingsShouldNoIndex(params: {
  q?: string
  lat?: number
  lng?: number
  radiusKm?: number
}): boolean {
  if (params.q?.trim()) return true
  if (params.lat != null || params.lng != null || params.radiusKm != null) return true
  return false
}

export function pageTitle(segment: string): string {
  return segment
}

export function defaultOgImage(): string {
  return absoluteUrl("/logo.png")
}

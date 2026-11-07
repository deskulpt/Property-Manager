/** Sitewide SEO helpers — absolute URLs, titles, robots meta, country hreflang. */

import { BUILTIN_PACKS } from "@/lib/markets/packs"
import { countryPrefixedPath, pathSegmentForIso } from "@/lib/markets/path-segments"

export const SITE_ORIGIN = "https://easyrental.space"
export const SITE_NAME = "Easy Rental"
/** Parent / CA federal operator (Aloke Nov7). */
export const ORG_LEGAL_NAME = "Deskulpt Inc"
/** Indian subsidiary (planned) — CountryPack IN `legalEntity`. */
export const ORG_LEGAL_NAME_IN = "Deskulpt Commerce India Pvt Ltd"

export function legalEntityForIso(iso: string): string {
  return iso.toUpperCase() === "IN" ? ORG_LEGAL_NAME_IN : ORG_LEGAL_NAME
}

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${SITE_ORIGIN}${normalized}`
}

export function countryAbsoluteUrl(iso: string, path = "/"): string {
  return absoluteUrl(countryPrefixedPath(iso, path))
}

export function listingsCanonical(
  searchParams?: {
    segment?: string
    area?: string
    featured?: boolean
  },
  iso = "IN",
): string {
  const next = new URLSearchParams()
  if (searchParams?.segment) next.set("segment", searchParams.segment)
  if (searchParams?.area) next.set("area", searchParams.area)
  if (searchParams?.featured) next.set("featured", "1")
  const qs = next.toString()
  const path = qs ? `/listings?${qs}` : "/listings"
  return countryAbsoluteUrl(iso, path)
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

export type HreflangAlternate = {
  href: string
  hreflang: string
}

/**
 * Build hreflang alternates for a path across configured CountryPacks.
 * `x-default` points at the root country picker (consent required).
 */
export function countryHreflangAlternates(path = "/"): HreflangAlternate[] {
  const normalized = path.startsWith("/") ? path : `/${path}`
  const alts: HreflangAlternate[] = [
    { href: absoluteUrl("/"), hreflang: "x-default" },
  ]
  for (const pack of Object.values(BUILTIN_PACKS)) {
    alts.push({
      href: countryAbsoluteUrl(pack.iso, normalized === "/" ? "/" : normalized),
      hreflang: pack.locale,
    })
  }
  return alts
}

/** Next.js Metadata alternates.languages map. */
export function countryLanguagesMetadata(path = "/"): Record<string, string> {
  const map: Record<string, string> = {}
  for (const alt of countryHreflangAlternates(path)) {
    map[alt.hreflang] = alt.href
  }
  return map
}

export function countrySitemapPath(iso: string): string {
  return `/sitemap-${pathSegmentForIso(iso)}.xml`
}

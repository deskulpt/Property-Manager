/**
 * Pure CountryPack path helpers — safe for proxy.ts (no DB / server-only).
 * Adding `/us`, `/br`, … = add a builtin pack with pathSegment; no app tree fork.
 */

import { BUILTIN_PACKS } from "@/lib/markets/packs"

export const COUNTRY_CONSENT_COOKIE = "easyrental_country_consent"
export const COUNTRY_CONSENT_MAX_AGE = 60 * 60 * 24 * 365
export const COUNTRY_HEADER = "x-easyrental-country"

/** ISO → lowercase path segment from builtin packs (config-only surface). */
export function pathSegmentForIso(iso: string): string {
  const pack = BUILTIN_PACKS[iso.toUpperCase()]
  if (pack?.pathSegment) return pack.pathSegment
  return iso.trim().toLowerCase().slice(0, 2)
}

export function isoForPathSegment(segment: string): string | null {
  const needle = segment.trim().toLowerCase()
  if (!/^[a-z]{2}$/.test(needle)) return null
  for (const pack of Object.values(BUILTIN_PACKS)) {
    if (pack.pathSegment === needle) return pack.iso
  }
  // Config-only future packs: segment === iso lowercased when registered in BUILTIN_PACKS.
  const upper = needle.toUpperCase()
  if (BUILTIN_PACKS[upper]) return upper
  return null
}

/** All known public path segments from CountryPack config. */
export function knownPathSegments(): string[] {
  return Object.values(BUILTIN_PACKS).map((p) => p.pathSegment)
}

export function isKnownPathSegment(segment: string): boolean {
  return isoForPathSegment(segment) != null
}

export function countryPrefixedPath(iso: string, path = "/"): string {
  const segment = pathSegmentForIso(iso)
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (normalized === "/") return `/${segment}`
  return `/${segment}${normalized}`
}

/** Strip leading /in or /ca (any known segment). Returns internal path starting with /. */
export function stripCountryPrefix(pathname: string): { iso: string; path: string } | null {
  const parts = pathname.split("/")
  // ["", "in", "listings"] or ["", "in"]
  if (parts.length < 2 || !parts[1]) return null
  const iso = isoForPathSegment(parts[1])
  if (!iso) return null
  const rest = "/" + parts.slice(2).join("/")
  return { iso, path: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/" }
}

/**
 * Paths that must never take a country prefix (SEO/meta/assets/API).
 * Country sitemaps themselves live at /sitemap-{segment}.xml without rewrite.
 */
export function isCountryExemptPath(pathname: string): boolean {
  if (pathname === "/robots.txt" || pathname === "/llms.txt") return true
  if (pathname === "/sitemap.xml" || pathname.startsWith("/sitemap-")) return true
  if (pathname.startsWith("/api/")) return true
  if (pathname.startsWith("/_next/")) return true
  if (pathname.startsWith("/icons/")) return true
  if (pathname === "/favicon.ico" || pathname === "/favicon-32.png") return true
  if (pathname === "/apple-icon.png" || pathname === "/icon.png") return true
  if (pathname === "/manifest.webmanifest" || pathname === "/sw.js") return true
  if (pathname === "/logo.svg" || pathname === "/logo.png" || pathname === "/logo-white.svg") return true
  // Short referral / QR entry — resolve after load; do not force country first hop.
  if (pathname === "/r" || pathname.startsWith("/r/")) return true
  return false
}

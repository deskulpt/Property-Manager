import "server-only"

import { adapterForSite, resolveAdapter } from "@/lib/import/adapters"
import { readFixtureHtml } from "@/lib/import/fixtures"
import {
  hostMatchesSite,
  type ImportedListing,
  type ListingSiteId,
  siteById,
} from "@/lib/import/listing-schema"

export type FetchListingResult = {
  listing: ImportedListing
  /** true when fixture HTML was used instead of a live public fetch */
  usedFixture: boolean
  fetchNote: string
}

const FETCH_TIMEOUT_MS = 6_000

async function tryFetchPublicHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "EasyRentalListingImport/0.1 (+https://easyrental.space; demo; respects robots)",
      },
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const ctype = res.headers.get("content-type") ?? ""
    if (!ctype.includes("text/html") && !ctype.includes("application/xhtml")) {
      // Still try body — some CDNs omit type
    }
    const text = await res.text()
    if (text.length < 80) return null
    return text
  } catch {
    return null
  }
}

/**
 * Resolve site → validate host → parse public HTML when possible →
 * fixture HTML fallback so the demo always works. No login / CAPTCHA bypass.
 */
export async function fetchAndParseListing(input: {
  siteId: ListingSiteId
  url: string
  forceFixture?: boolean
}): Promise<FetchListingResult> {
  const site = siteById(input.siteId)
  let parsedUrl: URL
  try {
    parsedUrl = new URL(input.url)
  } catch {
    throw new Error("Enter a valid http(s) listing URL.")
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Listing URL must be http or https.")
  }
  if (!hostMatchesSite(parsedUrl.hostname, site)) {
    throw new Error(
      `URL host must match ${site.label} (${site.hosts.join(", ")}).`,
    )
  }
  const adapter = resolveAdapter(parsedUrl, input.siteId) ?? adapterForSite(input.siteId)
  if (!adapter.canHandle(parsedUrl)) {
    throw new Error(`Selected site cannot handle this URL host.`)
  }

  if (!input.forceFixture) {
    const live = await tryFetchPublicHtml(parsedUrl.toString())
    if (live) {
      try {
        const listing = adapter.parse(live, parsedUrl)
        if (listing.title && listing.sqft > 0) {
          return {
            listing,
            usedFixture: false,
            fetchNote: "Parsed public HTML from the listing URL.",
          }
        }
      } catch {
        /* fall through to fixture */
      }
    }
  }

  const fixture = readFixtureHtml(input.siteId)
  const listing = adapter.parse(fixture, parsedUrl)
  return {
    listing,
    usedFixture: true,
    fetchNote:
      "Live page was unavailable, blocked, or not publicly parseable. Demo fixture HTML was used instead. Respect each site’s robots.txt and terms — do not bypass login or CAPTCHA.",
  }
}

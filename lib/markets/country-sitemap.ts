import type { MetadataRoute } from "next"
import { listPortfolio, searchListings } from "@/lib/db"
import { countryAbsoluteUrl } from "@/lib/seo"

const STATIC_PATHS = [
  "/",
  "/listings",
  "/properties",
  "/pricing",
  "/refer",
  "/partners",
  "/about",
  "/ask",
  "/tools/rent-estimate",
  "/legal/terms",
  "/legal/privacy",
]

/** Build a country-scoped sitemap (paths already country-canonical). */
export function buildCountrySitemap(iso: string): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: countryAbsoluteUrl(iso, path),
    changeFrequency: path === "/listings" || path === "/" ? "daily" : "weekly",
    priority: path === "/" || path === "/listings" ? 1 : 0.7,
  }))

  for (const property of listPortfolio()) {
    entries.push({
      url: countryAbsoluteUrl(iso, `/properties/${property.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    })
  }

  for (const card of searchListings({ statuses: ["available"] })) {
    entries.push({
      url: countryAbsoluteUrl(iso, `/properties/${card.propertySlug}/units/${card.code}`),
      changeFrequency: "daily",
      priority: 0.9,
    })
  }

  return entries
}

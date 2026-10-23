import type { MetadataRoute } from "next"
import { listPortfolio, searchListings } from "@/lib/db"
import { absoluteUrl } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
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
    "/llms.txt",
  ]

  const entries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "/listings" ? "daily" : "weekly",
    priority: path === "/" || path === "/listings" ? 1 : 0.7,
  }))

  for (const property of listPortfolio()) {
    entries.push({
      url: absoluteUrl(`/properties/${property.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    })
  }

  for (const card of searchListings({ statuses: ["available"] })) {
    entries.push({
      url: absoluteUrl(`/properties/${card.propertySlug}/units/${card.code}`),
      changeFrequency: "daily",
      priority: 0.9,
    })
  }

  return entries
}

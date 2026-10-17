import type { MetadataRoute } from "next"
import { listPortfolio } from "@/lib/db"
import { PUBLIC_CRAWL_ROUTES, SITE_URL, absoluteUrl } from "@/lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_CRAWL_ROUTES.map((route) => ({
    url: absoluteUrl(route.path, SITE_URL),
    lastModified: now,
    changeFrequency: route.path === "/" || route.path === "/listings" ? "daily" : "weekly",
    priority: route.priority,
  }))

  const propertyEntries: MetadataRoute.Sitemap = []
  try {
    for (const property of listPortfolio()) {
      propertyEntries.push({
        url: absoluteUrl(`/properties/${property.slug}`, SITE_URL),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.85,
      })
      for (const unit of property.units) {
        if (unit.status === "leased") continue
        propertyEntries.push({
          url: absoluteUrl(`/properties/${property.slug}/units/${unit.code}`, SITE_URL),
          lastModified: now,
          changeFrequency: "daily",
          priority: 0.8,
        })
      }
    }
  } catch {
    /* sitemap still valid without DB during cold build edge cases */
  }

  return [...staticEntries, ...propertyEntries]
}

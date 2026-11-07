import type { MetadataRoute } from "next"
import { BUILTIN_PACKS } from "@/lib/markets/packs"
import { absoluteUrl, countrySitemapPath } from "@/lib/seo"

/** Root sitemap index — points at per-country sitemaps. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
      lastModified: now,
    },
  ]

  for (const pack of Object.values(BUILTIN_PACKS)) {
    entries.push({
      url: absoluteUrl(countrySitemapPath(pack.iso)),
      changeFrequency: "daily",
      priority: 0.9,
      lastModified: now,
    })
  }

  return entries
}

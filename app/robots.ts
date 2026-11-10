import type { MetadataRoute } from "next"
import { BUILTIN_PACKS } from "@/lib/markets/packs"
import { absoluteUrl, countrySitemapPath } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  const countrySitemaps = Object.values(BUILTIN_PACKS).map((p) =>
    absoluteUrl(countrySitemapPath(p.iso)),
  )
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/in",
          "/ca",
          "/in/listings",
          "/ca/listings",
          "/in/properties",
          "/ca/properties",
          "/in/pricing",
          "/ca/pricing",
          "/in/refer",
          "/ca/refer",
          "/in/tools/",
          "/ca/tools/",
          "/in/about",
          "/ca/about",
          "/in/ask",
          "/ca/ask",
        ],
        disallow: [
          "/console",
          "/cms",
          "/landlord",
          "/account",
          "/portal",
          "/inbox",
          "/api/",
          "/admin",
          "/in/console",
          "/ca/console",
          "/in/landlord",
          "/ca/landlord",
          "/in/account",
          "/ca/account",
          "/in/portal",
          "/ca/portal",
          "/in/cms",
          "/ca/cms",
        ],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/in", "/ca", "/in/listings", "/ca/listings", "/in/properties", "/ca/properties", "/llms.txt"],
        disallow: ["/console", "/cms", "/landlord", "/account", "/portal", "/inbox", "/api/"],
      },
    ],
    sitemap: [absoluteUrl("/sitemap.xml"), ...countrySitemaps],
    host: absoluteUrl("/"),
  }
}

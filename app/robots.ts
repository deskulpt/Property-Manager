import type { MetadataRoute } from "next"
import { absoluteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/listings", "/properties", "/pricing", "/refer", "/tools/", "/about", "/ask"],
        disallow: ["/console", "/cms", "/landlord", "/account", "/portal", "/inbox", "/api/", "/admin"],
      },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: ["/", "/listings", "/properties", "/llms.txt"],
        disallow: ["/console", "/cms", "/landlord", "/account", "/portal", "/inbox", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  }
}

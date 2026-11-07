import { buildCountrySitemap } from "@/lib/markets/country-sitemap"

export const dynamic = "force-dynamic"

function toXml(entries: { url: string; changeFrequency?: string; priority?: number }[]) {
  const body = entries
    .map(
      (e) => `  <url>
    <loc>${e.url}</loc>
    ${e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : ""}
    ${e.priority != null ? `<priority>${e.priority}</priority>` : ""}
  </url>`,
    )
    .join("\n")
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

export async function GET() {
  const entries = buildCountrySitemap("IN")
  return new Response(toXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}

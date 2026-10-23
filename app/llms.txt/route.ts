import { listPortfolio, searchListings } from "@/lib/db"
import { absoluteUrl, ORG_LEGAL_NAME, SITE_NAME, SITE_ORIGIN } from "@/lib/seo"

export const dynamic = "force-dynamic"

export function GET() {
  const available = searchListings({ statuses: ["available"], sort: "featured" })
  const portfolio = listPortfolio()
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> Multi-segment leasing marketplace by ${ORG_LEGAL_NAME}. Browse available warehouses, commercial, retail, and residential units in India (Hyderabad corridors and demo parks).`,
    "",
    `Site: ${SITE_ORIGIN}`,
    `Contact: hello@easyrental.space`,
    "",
    "## Primary URLs",
    "",
    `- Home: ${absoluteUrl("/")}`,
    `- Available listings marketplace: ${absoluteUrl("/listings")}`,
    `- Portfolio: ${absoluteUrl("/properties")}`,
    `- Pricing: ${absoluteUrl("/pricing")}`,
    `- Refer & Earn: ${absoluteUrl("/refer")}`,
    `- Ask Easy (informational / stub-safe): ${absoluteUrl("/ask")}`,
    `- Rent estimate tool: ${absoluteUrl("/tools/rent-estimate")}`,
    `- About: ${absoluteUrl("/about")}`,
    `- Terms: ${absoluteUrl("/legal/terms")}`,
    `- Privacy: ${absoluteUrl("/legal/privacy")}`,
    "",
    "## Marketplace facts",
    "",
    `- Public catalog defaults to status=available (${available.length} units in this demo seed).`,
    `- Filter params: q, segment, area, pin, amenity, featured, min/max sqft & rate, docks, clear height, lat/lng/radiusKm, sort.`,
    `- Sort values: featured, newest, rate_asc, rate_desc, sqft_asc, sqft_desc, monthly_asc, monthly_desc, distance, name.`,
    `- Apply / landlord desk / console require authenticated roles — not public mutate APIs.`,
    "",
    "## Sample available units",
    "",
    ...available.slice(0, 12).map(
      (card) =>
        `- ${card.propertyName} · ${card.code} (${card.segment}, ${card.area}): ${absoluteUrl(`/properties/${card.propertySlug}/units/${card.code}`)}`,
    ),
    "",
    "## Properties",
    "",
    ...portfolio.slice(0, 20).map(
      (property) => `- ${property.name}: ${absoluteUrl(`/properties/${property.slug}`)}`,
    ),
    "",
    "## Honesty",
    "",
    "- No public write API for listings; MCP mutate tools are approval-gated for staff.",
    "- Rent estimates are indicative, not a quote.",
    "- Do not invent reviews or ratings; none are published as fake social proof.",
    "",
  ]

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  })
}

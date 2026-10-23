import {
  collectAmenities,
  dataAttr,
  firstMatch,
  jsonLdBlocks,
  metaContent,
  parseMoneyMajor,
  parseNumber,
  stripTags,
  titleTag,
} from "@/lib/import/adapters/html"
import type { ImportedListing, ListingSiteId } from "@/lib/import/listing-schema"
import { siteById } from "@/lib/import/listing-schema"

const AMENITIES = [
  "Dock doors",
  "Drive-in",
  "Power",
  "Parking",
  "Security",
  "Lift",
  "HVAC",
  "Sprinklers",
  "Office build-out",
  "Yard",
]

function fromJsonLd(html: string) {
  const blocks = jsonLdBlocks(html)
  for (const block of blocks) {
    const type = String(block["@type"] ?? "")
    if (!/Apartment|House|Residence|Place|Product|RealEstateListing|Offer/i.test(type)) continue
    const address =
      typeof block.address === "object" && block.address
        ? (block.address as Record<string, unknown>)
        : null
    const geo =
      typeof block.geo === "object" && block.geo ? (block.geo as Record<string, unknown>) : null
    const offers =
      typeof block.offers === "object" && block.offers
        ? (block.offers as Record<string, unknown>)
        : null
    return {
      title: typeof block.name === "string" ? block.name : null,
      description: typeof block.description === "string" ? block.description : null,
      address: address
        ? [address.streetAddress, address.addressLocality].filter(Boolean).join(", ")
        : typeof block.address === "string"
          ? block.address
          : null,
      city: address && typeof address.addressLocality === "string" ? address.addressLocality : null,
      postalCode:
        address && typeof address.postalCode === "string" ? address.postalCode : null,
      latitude: geo ? Number(geo.latitude) : null,
      longitude: geo ? Number(geo.longitude) : null,
      rent: offers ? parseMoneyMajor(String(offers.price ?? "")) : null,
      photos: Array.isArray(block.image)
        ? block.image.map(String)
        : typeof block.image === "string"
          ? [block.image]
          : [],
    }
  }
  return null
}

/** Map public HTML (+ Easy Rental fixture markers) into the shared schema. */
export function parseListingHtml(
  html: string,
  url: URL,
  siteId: ListingSiteId,
): ImportedListing {
  const site = siteById(siteId)
  const ld = fromJsonLd(html)

  const title =
    dataAttr(html, "data-er-title") ||
    metaContent(html, "og:title") ||
    ld?.title ||
    titleTag(html) ||
    "Imported listing"

  const address =
    dataAttr(html, "data-er-address") ||
    ld?.address ||
    firstMatch(html, [
      /data-address=["']([^"']+)["']/i,
      /Address[:\s]+<\/[^>]+>\s*<[^>]+>([^<]+)/i,
    ]) ||
    "Address TBD"

  const city =
    dataAttr(html, "data-er-city") ||
    ld?.city ||
    firstMatch(html, [/data-city=["']([^"']+)["']/i]) ||
    (site.market === "CA" ? "Toronto" : "Mumbai")

  const postalCode =
    dataAttr(html, "data-er-postal") ||
    ld?.postalCode ||
    firstMatch(html, [
      /PIN[:\s]+(\d{6})/i,
      /Postal[:\s]+([A-Z]\d[A-Z]\s?\d[A-Z]\d)/i,
      /data-postal=["']([^"']+)["']/i,
    ]) ||
    (site.market === "CA" ? "M5V 2T6" : "400001")

  const sqft =
    parseNumber(dataAttr(html, "data-er-sqft")) ||
    parseNumber(firstMatch(html, [/(\d[\d,]*)\s*(?:SF|sq\.?\s*ft|sqft)/i])) ||
    10000

  const rent =
    parseMoneyMajor(dataAttr(html, "data-er-rent")) ||
    ld?.rent ||
    parseMoneyMajor(
      firstMatch(html, [
        /₹\s*([\d,.]+(?:\s*(?:lakh|lac|cr|crore))?)/i,
        /CAD\s*\$?\s*([\d,.]+)/i,
        /\$\s*([\d,.]+)\s*(?:\/mo|per month)?/i,
      ]),
    ) ||
    0

  const deposit = parseMoneyMajor(dataAttr(html, "data-er-deposit"))

  const propertyType =
    dataAttr(html, "data-er-type") ||
    firstMatch(html, [/Property type[:\s]+([^<\n]+)/i]) ||
    "Industrial"

  const description =
    dataAttr(html, "data-er-description") ||
    metaContent(html, "og:description") ||
    ld?.description ||
    stripTags(html).slice(0, 600)

  const photoMeta = metaContent(html, "og:image")
  const photos = [
    ...(ld?.photos ?? []),
    ...(photoMeta ? [photoMeta] : []),
    ...Array.from(html.matchAll(/data-er-photo=["']([^"']+)["']/gi)).map((m) => m[1]!),
  ].filter(Boolean)

  const lat = parseNumber(dataAttr(html, "data-er-lat")) ?? ld?.latitude ?? null
  const lng = parseNumber(dataAttr(html, "data-er-lng")) ?? ld?.longitude ?? null

  const amenitiesRaw = dataAttr(html, "data-er-amenities")
  const amenities = amenitiesRaw
    ? amenitiesRaw.split("|").map((s) => s.trim()).filter(Boolean)
    : collectAmenities(html, AMENITIES)

  return {
    title,
    address,
    city,
    postalCode,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lng != null && Number.isFinite(lng) ? lng : null,
    sqft,
    rent,
    currency: site.currency,
    deposit: deposit ?? null,
    propertyType,
    amenities,
    description,
    photos,
    sourceSite: siteId,
    sourceUrl: url.toString(),
    scrapedAt: new Date().toISOString(),
  }
}

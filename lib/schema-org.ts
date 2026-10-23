import { absoluteUrl, ORG_LEGAL_NAME, SITE_NAME, SITE_ORIGIN } from "@/lib/seo"
import type { ListingCard, UnitRecord } from "@/lib/db"
import type { PropertySegment } from "@/lib/listing-schemas"
import { unitMonthlyRentCents } from "@/lib/format"

type JsonLd = Record<string, unknown>

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    legalName: ORG_LEGAL_NAME,
    url: SITE_ORIGIN,
    logo: absoluteUrl("/logo.png"),
    email: "hello@easyrental.space",
    description:
      "Easy Rental is an industrial and multi-segment leasing marketplace operated by DeSkulpt Inc. Browse available warehouses, commercial, retail, and residential units.",
  }
}

export function websiteSearchActionJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_ORIGIN,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/listings?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

function segmentAccommodationType(segment: PropertySegment): string {
  switch (segment) {
    case "residential":
      return "Apartment"
    case "warehouse":
      return "Warehouse"
    case "commercial":
    case "retail":
      return "Accommodation"
    default:
      return "Accommodation"
  }
}

function availabilityUrl(status: string): string {
  if (status === "available") return "https://schema.org/InStock"
  if (status === "pending") return "https://schema.org/LimitedAvailability"
  return "https://schema.org/OutOfStock"
}

export function listingsItemListJsonLd(cards: ListingCard[]): JsonLd {
  const elements = cards.slice(0, 50).map((card, index) => {
    const url = absoluteUrl(`/properties/${card.propertySlug}/units/${card.code}`)
    return {
      "@type": "ListItem",
      position: index + 1,
      url,
      name: `${card.propertyName} · Unit ${card.code}`,
      item: {
        "@type": "RealEstateListing",
        name: `${card.propertyName} · Unit ${card.code}`,
        url,
      },
    }
  })

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Available spaces · Easy Rental",
    url: absoluteUrl("/listings"),
    description:
      "Public marketplace of available industrial, commercial, retail, and residential units listed on Easy Rental.",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cards.length,
      itemListElement: elements,
    },
  }
}

export function unitRealEstateListingJsonLd(input: {
  property: {
    name: string
    slug: string
    address: string
    area: string
    cityLine: string
    pinCode: string | null
    latitude: number | null
    longitude: number | null
    segment: PropertySegment
    tenantName: string
  }
  unit: UnitRecord
}): JsonLd {
  const { property, unit } = input
  const url = absoluteUrl(`/properties/${property.slug}/units/${unit.code}`)
  const monthly = unitMonthlyRentCents(unit) / 100
  const amenityFeature: JsonLd[] = []
  if (unit.docks > 0) {
    amenityFeature.push({ "@type": "LocationFeatureSpecification", name: "Dock", value: unit.docks })
  }
  if (unit.driveIns > 0) {
    amenityFeature.push({
      "@type": "LocationFeatureSpecification",
      name: "Drive-in",
      value: unit.driveIns,
    })
  }
  if (unit.power) {
    amenityFeature.push({
      "@type": "LocationFeatureSpecification",
      name: "Power",
      value: unit.power,
    })
  }
  if (unit.clearHeight) {
    amenityFeature.push({
      "@type": "LocationFeatureSpecification",
      name: "Clear height",
      value: unit.clearHeight,
    })
  }

  const place: JsonLd = {
    "@type": segmentAccommodationType(property.segment),
    name: `${property.name} · Unit ${unit.code}`,
    description: unit.description,
    floorSize: {
      "@type": "QuantitativeValue",
      value: unit.sqft,
      unitCode: "FTK",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.area,
      addressRegion: property.cityLine,
      postalCode: property.pinCode ?? undefined,
      addressCountry: "IN",
    },
  }
  if (property.latitude != null && property.longitude != null) {
    place.geo = {
      "@type": "GeoCoordinates",
      latitude: property.latitude,
      longitude: property.longitude,
    }
  }
  if (amenityFeature.length) place.amenityFeature = amenityFeature

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${property.name} · Unit ${unit.code}`,
    url,
    datePosted: unit.listedAt ?? undefined,
    description: unit.description,
    provider: {
      "@type": "Organization",
      name: property.tenantName,
    },
    offers: {
      "@type": "Offer",
      price: monthly,
      priceCurrency: "INR",
      availability: availabilityUrl(unit.status),
      url,
    },
    about: place,
  }
}

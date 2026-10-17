/** Shared SEO helpers — Easy Rental (easyrental.space). */

export const SITE_URL = "https://easyrental.space"
export const SITE_NAME = "Easy Rental"
export const SITE_TAGLINE =
  "Industrial leasing desk for India C&I — list once, lease direct, no brokerage."
export const ORG_NAME = "DeSkulpt Inc."
export const DEFAULT_OG_IMAGE = "/logo.png"

export type PageSeo = {
  title: string
  description: string
  path: string
  image?: string
  type?: "website" | "article"
}

/** Public marketing + browse routes the agentic crawler and sitemap share. */
export const PUBLIC_CRAWL_ROUTES: { path: string; title: string; priority: number }[] = [
  { path: "/", title: "Home", priority: 1 },
  { path: "/listings", title: "Listings", priority: 0.9 },
  { path: "/properties", title: "Portfolio", priority: 0.9 },
  { path: "/pricing", title: "Pricing", priority: 0.8 },
  { path: "/about", title: "About", priority: 0.6 },
  { path: "/careers", title: "Careers", priority: 0.4 },
  { path: "/partners", title: "Partners", priority: 0.7 },
  { path: "/refer", title: "Refer & Earn", priority: 0.6 },
  { path: "/tools/rent-estimate", title: "Rent estimate", priority: 0.7 },
  { path: "/legal/terms", title: "Terms", priority: 0.3 },
  { path: "/legal/privacy", title: "Privacy", priority: 0.3 },
  { path: "/signup", title: "Sign up", priority: 0.5 },
  { path: "/login", title: "Log in", priority: 0.4 },
]

export function absoluteUrl(path: string, base = SITE_URL) {
  if (path.startsWith("http")) return path
  const p = path.startsWith("/") ? path : `/${path}`
  return `${base.replace(/\/$/, "")}${p}`
}

export function buildMetadata(page: PageSeo) {
  const url = absoluteUrl(page.path)
  const image = absoluteUrl(page.image ?? DEFAULT_OG_IMAGE)
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${page.title} · ${SITE_NAME}`,
      description: page.description,
      url,
      siteName: SITE_NAME,
      type: page.type ?? "website",
      locale: "en_IN",
      images: [{ url: image, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${page.title} · ${SITE_NAME}`,
      description: page.description,
      images: [image],
    },
  }
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    legalName: ORG_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/logo.svg"),
    description: SITE_TAGLINE,
    areaServed: {
      "@type": "Country",
      name: "India",
    },
    parentOrganization: {
      "@type": "Organization",
      name: ORG_NAME,
    },
  }
}

export function realEstateListingJsonLd(input: {
  name: string
  description: string
  url: string
  address: string
  locality?: string
  postalCode?: string | null
  latitude?: number | null
  longitude?: number | null
  floorSizeSqft: number
  priceInrPerMonth: number
  availability: "available" | "pending" | "leased" | string
}) {
  const availability =
    input.availability === "available"
      ? "https://schema.org/InStock"
      : input.availability === "pending"
        ? "https://schema.org/LimitedAvailability"
        : "https://schema.org/OutOfStock"

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: input.name,
    description: input.description,
    url: input.url,
    datePosted: new Date().toISOString().slice(0, 10),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: Math.round(input.priceInrPerMonth),
      availability,
    },
    about: {
      "@type": "Accommodation",
      name: input.name,
      floorSize: {
        "@type": "QuantitativeValue",
        value: input.floorSizeSqft,
        unitCode: "FTK",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: input.address,
        addressLocality: input.locality,
        postalCode: input.postalCode ?? undefined,
        addressCountry: "IN",
      },
      geo:
        input.latitude != null && input.longitude != null
          ? {
              "@type": "GeoCoordinates",
              latitude: input.latitude,
              longitude: input.longitude,
            }
          : undefined,
    },
  }
}

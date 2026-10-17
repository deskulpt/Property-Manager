import { z } from "zod"

/** Stable adapter IDs — India + Canada popular listing sites. */
export const LISTING_SITE_IDS = [
  "nobroker",
  "99acres",
  "magicbricks",
  "housing",
  "realtor-ca",
  "kijiji",
  "loopnet-ca",
] as const

export type ListingSiteId = (typeof LISTING_SITE_IDS)[number]

export const listingSiteIdSchema = z.enum(LISTING_SITE_IDS)

export const importedListingSchema = z.object({
  title: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  /** India PIN or Canada postal code. */
  postalCode: z.string().min(1),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  sqft: z.number().positive(),
  /** Asking rent in major currency units (INR or CAD by market). */
  rent: z.number().nonnegative(),
  currency: z.enum(["INR", "CAD"]),
  deposit: z.number().nonnegative().nullable().optional(),
  propertyType: z.string().min(1),
  amenities: z.array(z.string()).default([]),
  description: z.string().default(""),
  photos: z.array(z.string().url().or(z.string().startsWith("/"))).default([]),
  sourceSite: listingSiteIdSchema,
  sourceUrl: z.string().url(),
  scrapedAt: z.string().datetime(),
})

export type ImportedListing = z.infer<typeof importedListingSchema>

export type ListingMarket = "IN" | "CA"

export type ListingSiteMeta = {
  id: ListingSiteId
  label: string
  market: ListingMarket
  hosts: string[]
  exampleUrl: string
  currency: "INR" | "CAD"
}

export const LISTING_SITES: ListingSiteMeta[] = [
  {
    id: "nobroker",
    label: "NoBroker (India)",
    market: "IN",
    hosts: ["www.nobroker.in", "nobroker.in"],
    exampleUrl: "https://www.nobroker.in/property/rent/mumbai/demo-bay-a2",
    currency: "INR",
  },
  {
    id: "99acres",
    label: "99acres (India)",
    market: "IN",
    hosts: ["www.99acres.com", "99acres.com"],
    exampleUrl: "https://www.99acres.com/industrial-shed-in-bhiwandi-demo",
    currency: "INR",
  },
  {
    id: "magicbricks",
    label: "MagicBricks (India)",
    market: "IN",
    hosts: ["www.magicbricks.com", "magicbricks.com"],
    exampleUrl: "https://www.magicbricks.com/propertyDetails/demo-warehouse-whitefield",
    currency: "INR",
  },
  {
    id: "housing",
    label: "Housing.com (India)",
    market: "IN",
    hosts: ["housing.com", "www.housing.com"],
    exampleUrl: "https://housing.com/rent/demo-andheri-east-bay",
    currency: "INR",
  },
  {
    id: "realtor-ca",
    label: "Realtor.ca (Canada)",
    market: "CA",
    hosts: ["www.realtor.ca", "realtor.ca"],
    exampleUrl: "https://www.realtor.ca/real-estate/demo-mississauga-warehouse",
    currency: "CAD",
  },
  {
    id: "kijiji",
    label: "Kijiji (Canada)",
    market: "CA",
    hosts: ["www.kijiji.ca", "kijiji.ca"],
    exampleUrl: "https://www.kijiji.ca/v-commercial-office-space/demo-brampton-bay",
    currency: "CAD",
  },
  {
    id: "loopnet-ca",
    label: "LoopNet Canada",
    market: "CA",
    hosts: ["www.loopnet.ca", "loopnet.ca", "www.loopnet.com", "loopnet.com"],
    exampleUrl: "https://www.loopnet.ca/Listing/demo-vaughan-industrial",
    currency: "CAD",
  },
]

export function siteById(id: ListingSiteId): ListingSiteMeta {
  const site = LISTING_SITES.find((s) => s.id === id)
  if (!site) throw new Error(`Unknown listing site: ${id}`)
  return site
}

export function hostMatchesSite(hostname: string, site: ListingSiteMeta) {
  const host = hostname.toLowerCase().replace(/^www\./, "")
  return site.hosts.some((allowed) => {
    const a = allowed.toLowerCase().replace(/^www\./, "")
    return host === a || host.endsWith(`.${a}`)
  })
}

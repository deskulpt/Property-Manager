import type { Metadata } from "next"
import { EmptyState, PageHeader } from "@/components/product"
import { ListingBoard } from "@/components/listings/listing-board"
import { ListingsMap } from "@/components/map/listings-map"
import { ListingsFilterForm } from "@/components/listings/filter-form"
import { JsonLd } from "@/components/seo/json-ld"
import {
  isListingAmenity,
  listingFacets,
  searchListings,
  type ListingAmenity,
  type ListingFilters,
} from "@/lib/db"
import type { UnitStatus } from "@/lib/format"
import { isPropertySegment } from "@/lib/listing-schemas"
import { listingsItemListJsonLd } from "@/lib/schema-org"
import { listingsCanonical, listingsShouldNoIndex, pageTitle } from "@/lib/seo"

function numParam(value: string | string[] | undefined) {
  if (typeof value !== "string" || value.trim() === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function boolParam(value: string | string[] | undefined) {
  return value === "1" || value === "true"
}

function amenityParams(value: string | string[] | undefined): ListingAmenity[] | undefined {
  const raw = (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(isListingAmenity)
  return raw.length ? raw : undefined
}

const SORTS = new Set([
  "rate_asc",
  "rate_desc",
  "sqft_asc",
  "sqft_desc",
  "monthly_asc",
  "monthly_desc",
  "name",
  "featured",
  "newest",
  "distance",
] as const)

type SortValue = ListingFilters["sort"]

function parseSort(value: string | string[] | undefined): SortValue {
  const raw = typeof value === "string" ? value : undefined
  if (raw && SORTS.has(raw as never)) return raw as SortValue
  return "featured"
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q : undefined
  const segment = typeof params.segment === "string" ? params.segment : undefined
  const area = typeof params.area === "string" ? params.area : undefined
  const featured = boolParam(params.featured)
  const noIndex = listingsShouldNoIndex({
    q,
    lat: numParam(params.lat),
    lng: numParam(params.lng),
    radiusKm: numParam(params.radiusKm),
  })
  const titleBits = [
    featured ? "Featured" : null,
    segment && isPropertySegment(segment) ? segment : null,
    area,
    "Available spaces",
  ].filter(Boolean)
  return {
    title: pageTitle(titleBits.join(" · ")),
    description:
      "Browse available warehouse, commercial, retail, and residential units on Easy Rental — Hyderabad corridors and demo parks across landlord organisations.",
    alternates: {
      canonical: listingsCanonical({
        segment: segment && isPropertySegment(segment) ? segment : undefined,
        area,
        featured: featured || undefined,
      }),
    },
    robots: noIndex ? { index: false, follow: true } : { index: true, follow: true },
  }
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const statusRaw = params.status
  const statuses = (Array.isArray(statusRaw) ? statusRaw : statusRaw ? [statusRaw] : [])
    .flatMap((value) => String(value).split(","))
    .filter(
      (value): value is UnitStatus =>
        value === "available" || value === "pending" || value === "leased",
    )

  const segmentParam = typeof params.segment === "string" ? params.segment : undefined
  const statusUnset = !statusRaw || (Array.isArray(statusRaw) && statusRaw.length === 0)

  const filters: ListingFilters = {
    q: typeof params.q === "string" ? params.q : undefined,
    tenantId: typeof params.tenantId === "string" ? params.tenantId : undefined,
    area: typeof params.area === "string" ? params.area : undefined,
    pin: typeof params.pin === "string" ? params.pin : undefined,
    segment: segmentParam && isPropertySegment(segmentParam) ? segmentParam : undefined,
    // Default marketplace view: available only (leased hidden unless opted in).
    statuses: statuses.length ? statuses : statusUnset ? ["available"] : undefined,
    minSqft: numParam(params.minSqft),
    maxSqft: numParam(params.maxSqft),
    minRate: numParam(params.minRate),
    maxRate: numParam(params.maxRate),
    minMonthly: numParam(params.minMonthly),
    maxMonthly: numParam(params.maxMonthly),
    minDocks: numParam(params.minDocks),
    minDriveIns: numParam(params.minDriveIns),
    minClearHeight: numParam(params.minClearHeight),
    power: typeof params.power === "string" ? params.power : undefined,
    bhk: numParam(params.bhk),
    furnishing: typeof params.furnishing === "string" ? params.furnishing : undefined,
    fitOut: typeof params.fitOut === "string" ? params.fitOut : undefined,
    hasFloorPlan: boolParam(params.hasFloorPlan) || undefined,
    hasMatterport: boolParam(params.hasMatterport) || undefined,
    hasPano: boolParam(params.hasPano) || undefined,
    amenities: amenityParams(params.amenity),
    featured: boolParam(params.featured) || undefined,
    lat: numParam(params.lat),
    lng: numParam(params.lng),
    radiusKm: numParam(params.radiusKm),
    sort: parseSort(params.sort),
  }

  const [facets, results, featuredRail] = await Promise.all([
    Promise.resolve(listingFacets()),
    Promise.resolve(searchListings(filters)),
    Promise.resolve(
      searchListings({
        statuses: filters.statuses,
        featured: true,
        sort: "featured",
      }),
    ),
  ])

  const showFeaturedRail = !filters.featured && featuredRail.length > 0
  const gridResults = filters.featured
    ? results
    : results.filter((card) => !featuredRail.some((f) => f.unitId === card.unitId))

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
      <JsonLd data={listingsItemListJsonLd(results)} />
      <PageHeader
        kicker="Easy Rental marketplace"
        title="Available spaces"
        lede="Public catalog of open units across landlord organisations — warehouse docks and clear height, Hyderabad commercial and residential inventory, Pro featured pins. Operated by DeSkulpt Inc."
      />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <ListingsFilterForm facets={facets} filters={filters} />
        <div>
          <ListingsMap
            pins={Array.from(
              new Map(
                results
                  .filter((card) => card.latitude != null && card.longitude != null)
                  .map((card) => [
                    card.propertyId,
                    {
                      id: card.propertyId,
                      lat: card.latitude as number,
                      lng: card.longitude as number,
                      label: `${card.propertyName} · Unit ${card.code}`,
                      href: `/properties/${card.propertySlug}/units/${card.code}`,
                    },
                  ]),
              ).values(),
            )}
          />
          {showFeaturedRail ? (
            <section className="mb-8" aria-label="Featured listings">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
                    Featured
                  </p>
                  <h2 className="font-serif text-xl font-semibold tracking-tight">
                    Pro-pinned spaces
                  </h2>
                </div>
                <a
                  href="/listings?featured=1"
                  className="text-sm font-semibold text-terra hover:underline"
                >
                  View featured only
                </a>
              </div>
              <ListingBoard results={featuredRail} mode="featured-rail" />
            </section>
          ) : null}
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            {results.length} unit{results.length === 1 ? "" : "s"}
            {filters.statuses?.length === 1 && filters.statuses[0] === "available"
              ? " · available"
              : ""}
          </p>
          {results.length === 0 ? (
            <EmptyState
              title="No units match these filters"
              body="Widen the area, clear amenity chips, or reset status. The portfolio map still shows every building with coordinates."
              action={{ href: "/listings", label: "Clear filters" }}
            />
          ) : (
            <ListingBoard
              results={showFeaturedRail ? gridResults : results}
              mode="directory"
            />
          )}
        </div>
      </div>
    </div>
  )
}

import { EmptyState, PageHeader } from "@/components/product"
import { ListingBoard } from "@/components/listings/listing-board"
import { ListingsMap } from "@/components/map/listings-map"
import { ListingsFilterForm } from "@/components/listings/filter-form"
import { listingFacets, searchListings, type ListingFilters } from "@/lib/db"
import type { UnitStatus } from "@/lib/format"
import { isPropertySegment } from "@/lib/listing-schemas"

export const metadata = { title: "Listings" }

function numParam(value: string | string[] | undefined) {
  if (typeof value !== "string" || value.trim() === "") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function boolParam(value: string | string[] | undefined) {
  return value === "1" || value === "true"
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

  const filters: ListingFilters = {
    q: typeof params.q === "string" ? params.q : undefined,
    tenantId: typeof params.tenantId === "string" ? params.tenantId : undefined,
    area: typeof params.area === "string" ? params.area : undefined,
    segment: segmentParam && isPropertySegment(segmentParam) ? segmentParam : undefined,
    statuses: statuses.length ? statuses : undefined,
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
    sort:
      params.sort === "rate_asc" ||
      params.sort === "rate_desc" ||
      params.sort === "sqft_asc" ||
      params.sort === "sqft_desc" ||
      params.sort === "monthly_asc" ||
      params.sort === "monthly_desc" ||
      params.sort === "name"
        ? params.sort
        : "name",
  }

  const [facets, results] = await Promise.all([
    Promise.resolve(listingFacets()),
    Promise.resolve(searchListings(filters)),
  ])

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
      <PageHeader
        kicker="Public listings"
        title="Search warehouse, commercial, and residential units."
        lede="Filter by segment across landlord organisations. Warehouse docks and clear height stay available; Hyderabad commercial and residential inventory is seeded for Deccan Spaces."
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
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            {results.length} unit{results.length === 1 ? "" : "s"}
          </p>
          {results.length === 0 ? (
            <EmptyState
              title="No units match these filters"
              body="Widen the area, clear the media checkboxes, or reset status. The portfolio map still shows every building."
              action={{ href: "/listings", label: "Clear filters" }}
            />
          ) : (
            <ListingBoard results={results} />
          )}
        </div>
      </div>
    </div>
  )
}

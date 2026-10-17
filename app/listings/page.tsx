import Link from "next/link"
import { EmptyState, PageHeader } from "@/components/product"
import { ListingBoard } from "@/components/listings/listing-board"
import { ListingsMap } from "@/components/map/listings-map"
import { ListingsFilterForm } from "@/components/listings/filter-form"
import { JsonLd } from "@/components/seo/json-ld"
import { listingFacets, searchListings, type ListingFilters } from "@/lib/db"
import type { UnitStatus } from "@/lib/format"
import { buildMetadata, organizationJsonLd } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Listings",
  description:
    "Browse available industrial bays across India — filter by SF, rate, docks, and corridor. Apply direct with No Broker.",
  path: "/listings",
})

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

  const filters: ListingFilters = {
    q: typeof params.q === "string" ? params.q : undefined,
    tenantId: typeof params.tenantId === "string" ? params.tenantId : undefined,
    area: typeof params.area === "string" ? params.area : undefined,
    statuses: statuses.length ? statuses : undefined,
    minSqft: numParam(params.minSqft),
    maxSqft: numParam(params.maxSqft),
    minRate: numParam(params.minRate),
    maxRate: numParam(params.maxRate),
    minDocks: numParam(params.minDocks),
    minDriveIns: numParam(params.minDriveIns),
    minClearHeight: numParam(params.minClearHeight),
    power: typeof params.power === "string" ? params.power : undefined,
    hasFloorPlan: boolParam(params.hasFloorPlan) || undefined,
    hasMatterport: boolParam(params.hasMatterport) || undefined,
    hasPano: boolParam(params.hasPano) || undefined,
    sort:
      params.sort === "rate_asc" ||
      params.sort === "rate_desc" ||
      params.sort === "sqft_asc" ||
      params.sort === "sqft_desc" ||
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
        title="Search every bay on Easy Rental."
        lede="Filter across landlord organisations. Featured, grid, and directory layouts share the same live seed — open a card for gallery, floor plan, and apply."
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
            {results.length} bay{results.length === 1 ? "" : "s"}
          </p>
          {results.length === 0 ? (
            <EmptyState
              title="No bays match these filters"
              body="Widen the area, clear the media checkboxes, or reset status. The portfolio map still shows every building."
              action={{ href: "/listings", label: "Clear filters" }}
            />
          ) : (
            <>
              <JsonLd data={organizationJsonLd()} />
              <p className="mb-4 text-sm text-ink-soft">
                Need a ballpark before touring?{" "}
                <Link
                  href="/tools/rent-estimate"
                  className="font-semibold text-terra underline-offset-4 hover:underline"
                >
                  Rent estimate calculator
                </Link>
                .
              </p>
              <ListingBoard results={results} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

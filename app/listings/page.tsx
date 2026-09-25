import Link from "next/link"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { listingFacets, searchListings, type ListingFilters } from "@/lib/db"
import { money, rateLabel, sqft, type UnitStatus } from "@/lib/format"
import { ListingsFilterForm } from "@/components/listings/filter-form"

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
    .filter((value): value is UnitStatus =>
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
        title="Search every bay on DeSkulpt."
        lede="Filter across both landlord organisations. Results are unit-first. Open a card for the gallery, floor plan, and apply path."
      />
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <ListingsFilterForm facets={facets} filters={filters} />
        <div>
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
            <div className="grid gap-3">
              {results.map((card) => (
                <article key={card.unitId} className="grid gap-3 bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-terra">
                      {card.tenantName} · {card.area}
                    </p>
                    <h2 className="mt-1 font-sans text-xl font-extrabold">
                      {card.propertyName} · Unit {card.code}
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">{card.address}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge status={card.status} />
                      <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                        {sqft(card.sqft)} · {card.clearHeight} clear · {card.docks} docks · {card.driveIns} drive-in · {card.power}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{card.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {card.floorPlanPath ? <span>Floor plan</span> : null}
                      {card.hasPano ? <span>360</span> : null}
                      {card.matterportUrl ? <span>Walkthrough</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-start justify-between gap-3 md:items-end">
                    <div className="text-left md:text-right">
                      <p className="font-sans text-2xl font-black text-brand">
                        ${rateLabel(card.ratePsf)}
                        <span className="ml-1 font-mono text-xs font-normal text-ink-faint">/ SF</span>
                      </p>
                      <p className="text-sm text-ink-soft">{money(card.monthlyCents)} / mo</p>
                    </div>
                    <Link
                      href={`/properties/${card.propertySlug}/units/${card.code}`}
                      className="bg-terra px-3 py-2 font-sans text-sm font-bold text-white"
                    >
                      Open unit
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

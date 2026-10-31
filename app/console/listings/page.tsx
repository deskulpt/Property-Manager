import Link from "next/link"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { consoleSetListingVisibility } from "@/lib/actions"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { sqft } from "@/lib/format"
import { isOpsFlagOn, listPlatformListingsInventory } from "@/lib/platform-ops"

export const metadata = { title: "Listings · Command center" }

export default async function ConsoleListingsPage() {
  await requirePlatformAdmin()
  const rows = listPlatformListingsInventory()
  const marketplaceOn = isOpsFlagOn("listings_marketplace")

  return (
    <div data-testid="console-listings">
      <PageHeader
        kicker="Inventory"
        title="Listings inventory"
        lede="Cross-tenant unit catalogue. Publish / hide updates listed_at (and listed when present). Landlord CRUD stays on the desk."
      />
      {!marketplaceOn ? (
        <p className="mb-4 border border-pending/30 bg-pending/10 px-3 py-2 text-sm">
          Public marketplace flag is off —{" "}
          <Link href="/console/flags" className="font-semibold text-terra underline">
            Flags
          </Link>
          .
        </p>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          title="No units"
          body="Seed or create listings from a landlord desk."
          action={{ href: "/landlord/listings", label: "Landlord listings" }}
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <article
              key={row.unitId}
              className="flex flex-wrap items-center justify-between gap-3 border border-brand/15 bg-card p-4"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-terra">
                  {row.tenantName} · {row.area}
                </p>
                <h2 className="font-serif text-lg font-semibold">
                  {row.propertyName} · Unit {row.code}
                </h2>
                <p className="text-sm text-ink-soft">
                  {sqft(row.sqft)} · <StatusBadge status={row.status} /> ·{" "}
                  {row.listed ? "listed" : "hidden"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/properties/${row.propertySlug}/units/${row.code}`}
                  className="border border-brand/20 px-3 py-1.5 text-sm hover:border-terra"
                >
                  Public
                </Link>
                <form action={consoleSetListingVisibility}>
                  <input type="hidden" name="unitId" value={row.unitId} />
                  <input type="hidden" name="listed" value={row.listed ? "0" : "1"} />
                  <SubmitButton variant="outline" pendingLabel="…">
                    {row.listed ? "Hide" : "Publish"}
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

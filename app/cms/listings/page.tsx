import Link from "next/link"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { cmsListingReadiness } from "@/lib/db"
import { canListPersona } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"
import { sqft } from "@/lib/format"

export const metadata = { title: "Listings CMS" }

export default async function CmsListingsPage() {
  const user = await getSessionUser()
  if (!user || !canListPersona(user.role, "listings")) {
    return (
      <EmptyState
        title="Not in your desk"
        body="Merchandisers, Property Managers, and Super Admins review listing readiness. No applicant emails appear here."
      />
    )
  }
  const rows = cmsListingReadiness(user)
  return (
    <div>
      <PageHeader
        kicker="Personas · inventory"
        title="Listing readiness"
        lede="Public catalog coverage for floor plans, 360 photos, and walkthrough embeds. Upload stays on the landlord desk."
      />
      <div className="grid gap-3">
        {rows.map((row) => (
          <article key={row.unitId} className="grid gap-2 bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-terra">
                {row.tenantName} · {row.area}
              </p>
              <h2 className="font-sans text-lg font-extrabold">
                {row.propertyName} · Unit {row.code}
              </h2>
              <p className="text-sm text-ink-soft">
                {sqft(row.sqft)} · <StatusBadge status={row.status} />
              </p>
              {row.gaps.length ? (
                <p className="mt-2 text-sm text-terra-dark">{row.gaps.join(" · ")}</p>
              ) : (
                <p className="mt-2 text-sm text-avail">Ready for merchandising</p>
              )}
            </div>
            <Link
              href={`/properties/${row.propertySlug}/units/${row.code}`}
              className="font-sans text-sm font-bold text-brand self-center"
            >
              Open public unit
            </Link>
          </article>
        ))}
      </div>
    </div>
  )
}

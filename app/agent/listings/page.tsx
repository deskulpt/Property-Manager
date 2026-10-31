import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { ListingEditor } from "@/components/listings/listing-editor"
import { EmptyState, PageHeader } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { listingRowsForTenant } from "@/lib/role-cms-store"
import { resolveAgentTenantId } from "@/lib/agent-context"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Agent listings" }

export default async function AgentListingsPage() {
  const user = await getSessionUser()
  const tenantId = user ? await resolveAgentTenantId(user.id) : null
  if (!user || !tenantId) {
    return <EmptyState title="Select a landlord" body="Choose a managed landlord first." action={{ href: "/agent", label: "Open landlords" }} />
  }
  const listings = listingRowsForTenant(tenantId)
  const portfolio = listPortfolio().filter((p) => p.tenantId === tenantId)
  const properties = portfolio.map((p) => ({ id: p.id, name: p.name }))
  return (
    <div>
      <PageHeader kicker="Listings" title="Create and edit" lede="Same listing tools as the landlord desk, scoped to the current landlord context." />
      <ListingEditor listings={listings} properties={properties} allowDelete={false} />
      <section className="mt-8" id="floors" data-testid="agent-floor-ingest-links">
        <h2 className="font-serif text-lg font-semibold text-primary">Floors · CAD · 3D</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Upload PDF or DXF for a building — walls, units, doors, stairs, and lifts only. Open the
          building desk for plan creator and 3D mesh binds.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {portfolio.map((property) => (
            <li key={property.id}>
              <Link
                href={`/agent/properties/${property.id}#cad-ingest`}
                className="btn btn-secondary btn-sm rounded-sm"
              >
                {property.name} · CAD/PDF ingest
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <DoNextFaq
        steps={[
          { title: "Create or edit a bay", body: "Use the form to add inventory or update description and Matterport URL." },
          { title: "Ingest a floor plan", body: "PDF or DXF on the building ingest page; publish syncs the public viewer." },
          { title: "Publish carefully", body: "Hidden listings stay off /listings until you are ready. Sync rates on Pricing." },
        ]}
        faqs={[
          { q: "Can I delete a building?", a: "No. Managing agents edit listings, pricing, and floor ingest only." },
        ]}
      />
    </div>
  )
}

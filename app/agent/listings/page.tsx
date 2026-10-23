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
  const properties = listPortfolio()
    .filter((p) => p.tenantId === tenantId)
    .map((p) => ({ id: p.id, name: p.name }))
  return (
    <div>
      <PageHeader kicker="Listings" title="Create and edit" lede="Same listing tools as the landlord desk, scoped to the current landlord context." />
      <ListingEditor listings={listings} properties={properties} />
      <DoNextFaq
        steps={[
          { title: "Create or edit a bay", body: "Use the form to add inventory or update description and Matterport URL." },
          { title: "Publish carefully", body: "Hidden listings stay off /listings until you are ready." },
          { title: "Sync pricing", body: "Use Pricing for focused rate adjustments." },
        ]}
        faqs={[
          { q: "Can I delete a building?", a: "No. Managing agents edit listings and pricing only." },
        ]}
      />
    </div>
  )
}

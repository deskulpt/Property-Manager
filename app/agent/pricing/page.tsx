import { DoNextFaq } from "@/components/cms/do-next-faq"
import { ListingEditor } from "@/components/listings/listing-editor"
import { EmptyState, PageHeader } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { listingRowsForTenant } from "@/lib/role-cms-store"
import { resolveAgentTenantId } from "@/lib/agent-context"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Agent pricing" }

export default async function AgentPricingPage() {
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
      <PageHeader kicker="Pricing" title="Adjust asking rent" lede="Rates are ₹/SF/month. Monthly INR totals update when you save." />
      <ListingEditor listings={listings} properties={properties} allowCreate={false} />
      <DoNextFaq
        steps={[
          { title: "Set the ₹/SF/month rate", body: "Save each bay after adjusting asking rent." },
          { title: "Confirm public visibility", body: "Published vs hidden controls catalogue exposure." },
          { title: "Tell the landlord", body: "Large rate moves should be confirmed with the org admin." },
        ]}
        faqs={[
          { q: "Does changing rate rewrite the ledger?", a: "No. Existing dues stay; new leases use the updated asking rent." },
        ]}
      />
    </div>
  )
}

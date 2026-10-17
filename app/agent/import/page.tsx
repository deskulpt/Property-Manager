import { ImportListingForm } from "@/components/listings/import-listing-form"
import { EmptyState, PageHeader } from "@/components/product"
import { resolveAgentTenantId } from "@/lib/agent-context"
import { LISTING_SITES } from "@/lib/import/listing-schema"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Import listing" }

export default async function AgentImportPage() {
  const user = await getSessionUser()
  if (!user || user.role !== "managing_agent") return null
  const tenantId = await resolveAgentTenantId(user.id)
  if (!tenantId) {
    return (
      <EmptyState
        title="Select a landlord"
        body="Choose a managed landlord before importing a listing URL."
        action={{ href: "/agent", label: "Open landlords" }}
      />
    )
  }
  return (
    <div>
      <PageHeader
        kicker="Listings"
        title="Import listing"
        lede="Same URL import tools as the landlord desk, scoped to the active managed organisation."
      />
      <ImportListingForm
        sites={LISTING_SITES}
        tenantId={tenantId}
        propertiesHref="/agent"
      />
    </div>
  )
}

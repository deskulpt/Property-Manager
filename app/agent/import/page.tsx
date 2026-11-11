import { ImportListingForm } from "@/components/listings/import-listing-form"
import { EmptyState, PageHeader } from "@/components/product"
import { resolveAgentTenantId } from "@/lib/agent-context"
import { listingSitesForMarket } from "@/lib/import/listing-schema"
import { requestCountryIso } from "@/lib/markets/request-country"
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
  const iso = user.countryIso || user.tenantCountryIso || (await requestCountryIso())
  const sites = listingSitesForMarket(iso)
  return (
    <div>
      <PageHeader
        kicker="Listings"
        title="Import listing"
        lede={
          iso === "CA"
            ? "Ontario landlord-direct only — scrape / MLS / DDF / Kijiji imports disabled for the managed organisation."
            : "Same URL import tools as the landlord desk, scoped to the active managed organisation."
        }
      />
      <ImportListingForm
        sites={sites}
        tenantId={tenantId}
        propertiesHref="/agent"
      />
    </div>
  )
}

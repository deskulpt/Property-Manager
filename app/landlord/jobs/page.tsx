import { JobDesk } from "@/components/landlord/job-desk"
import { PageHeader } from "@/components/product"
import { eligibleProvidersForProperty, jobsForTenant, listPortfolio } from "@/lib/db"
import { TRADES } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Concierge" }

export default async function JobsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const properties = listPortfolio().filter((property) => property.tenantId === user.tenantId)
  const providers = properties.flatMap((property) =>
    TRADES.flatMap((trade) =>
      eligibleProvidersForProperty(user.tenantId!, property.id, trade).map((provider) => ({
        ...provider,
        // Encode property area for client filter: prefer pin catchment label
        serviceArea: property.area,
        propertyId: property.id,
      })),
    ),
  )
  // Dedupe by id+serviceArea for JobDesk legacy filter
  const seen = new Set<string>()
  const unique = providers.filter((p) => {
    const key = `${p.id}:${p.serviceArea}:${p.trade}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return (
    <div>
      <PageHeader
        kicker="Concierge"
        title="Jobs for trades"
        lede="Assignment lists only active, demand-ok partners whose PIN/city/radius catchment covers the building — plus legacy approved providers in that area. Landlord approval required before notify."
      />
      <JobDesk
        jobs={jobsForTenant(user.tenantId)}
        properties={properties}
        providers={unique}
      />
    </div>
  )
}

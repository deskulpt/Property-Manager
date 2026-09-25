import { JobDesk } from "@/components/landlord/job-desk"
import { PageHeader } from "@/components/product"
import { jobsForTenant, listPortfolio, providersForTenant } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Concierge" }

export default async function JobsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  return (
    <div>
      <PageHeader
        kicker="Concierge"
        title="Jobs for trades"
        lede="Assignment lists are verified providers you approved, filtered to the building’s area and the job’s trade. A North York electrical job will not offer an East York electrician."
      />
      <JobDesk
        jobs={jobsForTenant(user.tenantId)}
        properties={listPortfolio().filter((property) => property.tenantId === user.tenantId)}
        providers={providersForTenant(user.tenantId)}
      />
    </div>
  )
}

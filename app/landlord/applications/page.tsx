import { ApplicationInbox } from "@/components/landlord/application-inbox"
import { PageHeader } from "@/components/product"
import { applicationsForTenant, providersForTenant } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Applications" }

export default async function ApplicationsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const applications = applicationsForTenant(user.tenantId)
  const providers = providersForTenant(user.tenantId).filter((provider) => provider.approval === "approved")
  return (
    <div>
      <PageHeader
        kicker="Inbox"
        title="Applications"
        lede="Approve to lease the bay and post next month’s rent. Deny returns a pending bay to available when nothing else is in review. Concierge jobs only offer trades you have approved for that area."
      />
      <ApplicationInbox applications={applications} providers={providers} />
    </div>
  )
}

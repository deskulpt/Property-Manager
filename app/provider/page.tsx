import { PageHeader } from "@/components/product"
import { ProviderBoard } from "@/components/provider/provider-board"
import { jobsForProvider } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Provider" }

export default async function ProviderPage() {
  const user = await getSessionUser()
  if (!user || user.role !== "service_provider") return null
  return (
    <div>
      <PageHeader
        kicker={user.providerVerified ? "Verified" : "Unverified"}
        title="Assigned work"
        lede="You do not see a public job board. A landlord assigns you after they approve you, and only for buildings in your service area."
      />
      <ProviderBoard jobs={jobsForProvider(user.id)} />
    </div>
  )
}

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
        kicker={user.providerVerified ? "L5 · Verified" : "L5 · Unverified"}
        title="Assigned work"
        lede="L5 Service Provider desk — not a public job board. After partner vetting activates your trade, landlords approve and assign jobs only inside your catchment."
      />
      <ProviderBoard jobs={jobsForProvider(user.id)} />
    </div>
  )
}

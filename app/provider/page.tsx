import { DoNextFaq } from "@/components/cms/do-next-faq"
import { PageHeader } from "@/components/product"
import { ProviderBoard } from "@/components/provider/provider-board"
import { jobsForProvider } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Provider" }

export default async function ProviderPage() {
  const user = await getSessionUser()
  if (!user || user.role !== "service_provider") return null
  const jobs = jobsForProvider(user.id)
  return (
    <div>
      <PageHeader
        kicker={user.providerVerified ? "Verified" : "Unverified"}
        title="Jobs in your area"
        lede="Geo-matched and landlord-approved only. You do not see a public job board."
      />
      <ProviderBoard jobs={jobs} />
      <DoNextFaq
        steps={[
          {
            title: jobs.length ? "Accept or complete assigned work" : "Finish profile verify",
            body: jobs.length
              ? "Update job status from the board."
              : "Confirm trade/catchment under Profile verify.",
          },
          { title: "Keep WhatsApp OTP current", body: "Open Profile so demo notices can reach you." },
          { title: "Stay inside catchment", body: "Jobs outside your service area never appear." },
        ]}
        faqs={[
          { q: "Who assigns me?", a: "A landlord after they approve you for their organisation — never auto-assign." },
          { q: "Can I see Harbourline jobs from Bhiwandi?", a: "No. Area and approval both must match." },
        ]}
      />
    </div>
  )
}

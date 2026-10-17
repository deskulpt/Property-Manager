import { DoNextFaq } from "@/components/cms/do-next-faq"
import { PageHeader } from "@/components/product"
import { VisitCalendarStub } from "@/components/visits/visit-calendar-stub"
import { getSessionUser } from "@/lib/session"
import { visitCountsForTenant } from "@/lib/role-cms-store"

export const metadata = { title: "Visits" }

export default async function LandlordVisitsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const counts = visitCountsForTenant(user.tenantId)
  return (
    <div>
      <PageHeader
        kicker="Scheduling"
        title="Visit calendar"
        lede={`Confirm, decline, or reschedule site visits. Requests recorded: ${counts.total}.`}
      />
      <VisitCalendarStub />
      <DoNextFaq
        steps={[
          { title: "Review new visit requests", body: "Open each request from the calendar board." },
          { title: "Confirm or decline promptly", body: "Applicants watch Inbox for status updates." },
          { title: "Align with listing tours", body: "Keep Matterport and bay details ready before the visit." },
        ]}
        faqs={[
          { q: "Where do visitors book?", a: "From the public unit page visit form." },
          { q: "Live calendar sync?", a: "This MVP is an in-product board — external calendar connectors come later." },
        ]}
      />
    </div>
  )
}

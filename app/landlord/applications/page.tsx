import { DoNextFaq } from "@/components/cms/do-next-faq"
import { ApplicationDesk } from "@/components/landlord/application-desk"
import { PageHeader } from "@/components/product"
import { applicationsForTenant } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Applications" }

export default async function ApplicationsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const applications = applicationsForTenant(user.tenantId)
  const counts = {
    pending: applications.filter((a) => a.status === "submitted").length,
    approved: applications.filter((a) => a.status === "approved").length,
    denied: applications.filter((a) => a.status === "denied").length,
  }
  return (
    <div>
      <PageHeader
        kicker="Inbox"
        title="Applications"
        lede="Pending count also appears on the desk nav. Approve leases the bay and posts next month's rent; reject returns a pending bay when nothing else is in review."
      />
      <ApplicationDesk applications={applications} counts={counts} />
      <DoNextFaq
        steps={[
          {
            title: counts.pending ? `Review ${counts.pending} pending` : "Watch for new applications",
            body: counts.pending
              ? "Approve or reject each submitted application with a clear decision."
              : "Share listing links so prospects can apply on public bay pages.",
          },
          {
            title: "Draft a rental agreement",
            body: "After approve, open Agreements to generate a standard India C&I lease PDF.",
          },
          {
            title: "Assign trade work if needed",
            body: "Open Concierge jobs when make-ready or ticket work needs a provider.",
          },
        ]}
        faqs={[
          {
            q: "What happens on approve?",
            a: "The bay becomes leased, other open applications on that bay are declined, and next month's rent + GST post to the ledger.",
          },
          {
            q: "Can a managing agent decide applications?",
            a: "Yes, for landlords they are invited to manage. They cannot change billing or Razorpay secrets.",
          },
          {
            q: "Is verification live UIDAI?",
            a: "No. Applicant Aadhaar checks are a demo stub for India flows only.",
          },
        ]}
      />
    </div>
  )
}

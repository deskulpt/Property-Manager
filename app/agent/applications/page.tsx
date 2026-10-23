import { DoNextFaq } from "@/components/cms/do-next-faq"
import { ApplicationDesk } from "@/components/landlord/application-desk"
import { EmptyState, PageHeader } from "@/components/product"
import { applicationsForTenant } from "@/lib/db"
import { resolveAgentTenantId } from "@/lib/agent-context"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Agent applications" }

export default async function AgentApplicationsPage() {
  const user = await getSessionUser()
  const tenantId = user ? await resolveAgentTenantId(user.id) : null
  if (!user || !tenantId) {
    return <EmptyState title="Select a landlord" body="Choose a managed landlord on the agent home first." action={{ href: "/agent", label: "Open landlords" }} />
  }
  const applications = applicationsForTenant(tenantId)
  const counts = {
    pending: applications.filter((a) => a.status === "submitted").length,
    approved: applications.filter((a) => a.status === "approved").length,
    denied: applications.filter((a) => a.status === "denied").length,
  }
  return (
    <div>
      <PageHeader
        kicker="Applications"
        title="Review queue"
        lede="Pending badge on the nav matches this landlord context only — not a portfolio sum."
      />
      <ApplicationDesk applications={applications} counts={counts} />
      <DoNextFaq
        steps={[
          { title: "Decide pending apps", body: "Approve or reject each submitted row." },
          { title: "Check listing readiness", body: "After approve, confirm the bay pricing still matches the offer." },
          { title: "Leave billing alone", body: "Send the landlord admin to Settings for Razorpay or domains." },
        ]}
        faqs={[
          { q: "Whose email do I see?", a: "Full applicant contact for managed landlords on this desk." },
          { q: "Can I approve for a landlord I’m not invited to?", a: "No. Commands check agent_landlord_access." },
        ]}
      />
    </div>
  )
}

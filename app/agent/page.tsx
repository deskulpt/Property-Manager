import { DoNextFaq } from "@/components/cms/do-next-faq"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { switchAgentLandlord } from "@/lib/actions"
import { agentLandlords } from "@/lib/role-cms-store"
import { getAgentTenantId, getSessionUser } from "@/lib/session"

export const metadata = { title: "Managing agent" }

export default async function AgentHomePage() {
  const user = await getSessionUser()
  if (!user) return null
  const landlords = agentLandlords(user.id)
  const currentId = await getAgentTenantId()
  return (
    <div>
      <PageHeader
        kicker={user.company ?? "Managing agent"}
        title="Managed landlords"
        lede="Switch landlord context explicitly. You never see merged portfolios, billing, or Razorpay secrets."
      />
      <div className="grid gap-3" data-testid="agent-landlord-list">
        {landlords.map((landlord) => (
          <article key={landlord.id} className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-card p-4">
            <div>
              <h2 className="font-serif text-lg font-semibold">{landlord.name}</h2>
              <p className="text-sm text-ink-soft">
                {landlord.city} · {landlord.propertyCount} properties · {landlord.pendingApps} pending applications
              </p>
              {currentId === landlord.id ? (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-terra">Current context</p>
              ) : null}
            </div>
            <form action={switchAgentLandlord}>
              <input type="hidden" name="tenantId" value={landlord.id} />
              <SubmitButton pendingLabel="Switching…">
                {currentId === landlord.id ? "Refresh context" : "Work as this landlord"}
              </SubmitButton>
            </form>
          </article>
        ))}
      </div>
      <DoNextFaq
        steps={[
          { title: "Pick a landlord", body: "Choose BBM or Harbourline — you are not invited to Sahni NRI." },
          { title: "Clear pending applications", body: "Open Applications and approve or reject with the pending badge as your guide." },
          { title: "Adjust listings and pricing", body: "Edit asking rent and publish state under Listings / Pricing." },
        ]}
        faqs={[
          { q: "Why can’t I open Sahni Global Realty?", a: "Demo seed only invites Riya to BBM and Harbourline. Isolation tests require a third landlord to stay out of reach." },
          { q: "Is this the same as platform Property Manager?", a: "No. Chris Vogel is platform staff. Managing agent is a multi-landlord collaborator role." },
          { q: "Can I change Razorpay keys?", a: "No. Billing, custom domains, and payment secrets stay with the landlord admin." },
        ]}
      />
    </div>
  )
}
